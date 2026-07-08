"""FastAPI app: POST /analyze — upload a contract file, or POST /analyze-text."""

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ingest import EmptyPdfError
from app.pipeline import analyze_contract, analyze_text
from app.schemas import ComplianceReport

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_EXTS = (".pdf", ".docx", ".doc", ".txt", ".md")

app = FastAPI(
    title="Aegix AI",
    description="Aegix AI — Philippine employment contract compliance "
    "checker. Not legal advice.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened to the Vercel domain at deploy time
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str
    filename: str = "Pasted text"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=ComplianceReport)
async def analyze(file: UploadFile = File(...)) -> ComplianceReport:
    name = file.filename or "contract.pdf"
    if not name.lower().endswith(ALLOWED_EXTS):
        raise HTTPException(415, "Upload a PDF, Word (.docx), or text file.")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File is larger than 10 MB.")
    try:
        return analyze_contract(data, name)
    except EmptyPdfError as e:
        raise HTTPException(422, str(e))


@app.post("/analyze-text", response_model=ComplianceReport)
async def analyze_pasted(req: TextRequest) -> ComplianceReport:
    if len(req.text) > MAX_BYTES:
        raise HTTPException(413, "Text is too long.")
    try:
        return analyze_text(req.text, req.filename or "Pasted text")
    except EmptyPdfError as e:
        raise HTTPException(422, str(e))
