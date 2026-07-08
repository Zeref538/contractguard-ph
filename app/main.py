"""FastAPI app: POST /analyze — upload a contract PDF, get a compliance report."""

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.ingest import EmptyPdfError
from app.pipeline import analyze_contract
from app.schemas import ComplianceReport

MAX_PDF_BYTES = 10 * 1024 * 1024

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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=ComplianceReport)
async def analyze(file: UploadFile = File(...)) -> ComplianceReport:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(415, "Please upload a PDF file.")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF is larger than 10 MB.")
    try:
        return analyze_contract(pdf_bytes, file.filename or "contract.pdf")
    except EmptyPdfError as e:
        raise HTTPException(422, str(e))
