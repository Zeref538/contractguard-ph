"""FastAPI app: POST /analyze — upload a contract file, or POST /analyze-text."""

import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ingest import EmptyPdfError
from app.pipeline import analyze_contract, analyze_text
from app.schemas import ComplianceReport

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


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
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
