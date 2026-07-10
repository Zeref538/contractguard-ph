"""FastAPI app: POST /analyze — upload a contract file, or POST /analyze-text."""

import json
import logging
import os
import time
from collections import defaultdict, deque
from typing import Iterator

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.ingest import EmptyPdfError
from app.pipeline import (
    analyze_contract,
    analyze_contract_stream,
    analyze_text,
    analyze_text_stream,
)
from app.schemas import ComplianceReport

log = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_EXTS = (".pdf", ".docx", ".doc", ".txt", ".md")

# Each analysis costs Azure tokens, so cap how many a single IP can run.
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_HOUR", "20"))
RATE_WINDOW = 3600

app = FastAPI(
    title="Aegix AI",
    description="Aegix AI — Philippine employment contract compliance "
    "checker. Not legal advice.",
)

# Lock this to the deployed frontend origin; "*" only for local development.
origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    """Real client IP, proxy-aware.

    Behind Render's proxy `request.client` is the proxy, not the visitor.
    The proxy appends the true client IP as the LAST X-Forwarded-For entry;
    earlier entries arrive from the client and are spoofable, so only the
    last one is trusted.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.rsplit(",", 1)[-1].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    hits = _hits[ip]
    while hits and now - hits[0] > RATE_WINDOW:
        hits.popleft()
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(
            429, f"Rate limit reached ({RATE_LIMIT}/hour). Try again later."
        )
    hits.append(now)


async def _read_capped(file: UploadFile) -> bytes:
    """Read the upload in chunks, aborting as soon as it exceeds MAX_BYTES.

    Reading first and checking the length afterwards would buffer an
    arbitrarily large body into memory before rejecting it.
    """
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(1 << 20):
        total += len(chunk)
        if total > MAX_BYTES:
            raise HTTPException(413, "File is larger than 10 MB.")
        chunks.append(chunk)
    return b"".join(chunks)


class TextRequest(BaseModel):
    text: str = Field(max_length=MAX_BYTES)
    filename: str = Field(default="Pasted text", max_length=200)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=ComplianceReport)
async def analyze(request: Request, file: UploadFile = File(...)) -> ComplianceReport:
    _rate_limit(request)
    name = file.filename or "contract.pdf"
    if not name.lower().endswith(ALLOWED_EXTS):
        raise HTTPException(415, "Upload a PDF, Word (.docx), or text file.")
    data = await _read_capped(file)
    try:
        # analyze_contract is blocking (network + CPU); keep it off the loop
        return await run_in_threadpool(analyze_contract, data, name)
    except EmptyPdfError as e:
        raise HTTPException(422, str(e))


@app.post("/analyze-text", response_model=ComplianceReport)
async def analyze_pasted(request: Request, req: TextRequest) -> ComplianceReport:
    _rate_limit(request)
    try:
        return await run_in_threadpool(
            analyze_text, req.text, req.filename or "Pasted text"
        )
    except EmptyPdfError as e:
        raise HTTPException(422, str(e))


# --------------------------------------------------------------- streaming

def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",  # stop nginx/HF proxies from buffering the stream
}


def _sse_stream(events: Iterator[tuple[str, dict]]) -> Iterator[str]:
    """Wrap a pipeline generator, turning failures into a terminal error event.

    Once the response has started we can no longer send an HTTP status code,
    so errors must travel as SSE events.
    """
    try:
        for event, payload in events:
            yield _sse(event, payload)
    except EmptyPdfError as e:
        yield _sse("error", {"detail": str(e)})
    except Exception:
        log.exception("streaming analysis failed")
        yield _sse("error", {"detail": "Analysis failed. Please try again."})


# Starlette iterates sync generators in a threadpool, so the blocking pipeline
# never runs on the event loop.
@app.post("/analyze/stream")
async def analyze_stream(request: Request, file: UploadFile = File(...)):
    _rate_limit(request)
    name = file.filename or "contract.pdf"
    if not name.lower().endswith(ALLOWED_EXTS):
        raise HTTPException(415, "Upload a PDF, Word (.docx), or text file.")
    data = await _read_capped(file)
    return StreamingResponse(
        _sse_stream(analyze_contract_stream(data, name)),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@app.post("/analyze-text/stream")
async def analyze_text_stream_ep(request: Request, req: TextRequest):
    _rate_limit(request)
    return StreamingResponse(
        _sse_stream(analyze_text_stream(req.text, req.filename or "Pasted text")),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
