"""Contract ingestion: turn an uploaded file or pasted text into raw text.

Supported inputs:
  - PDF  (PyMuPDF, with MarkItDown as a fallback)
  - DOCX (MarkItDown)
  - TXT  (decoded directly)
  - pasted plain text (used as-is)
"""

import os
import tempfile

import fitz

MIN_CHARS = 120


class EmptyPdfError(ValueError):
    """Raised when a document has no usable extractable text."""


def _markitdown_bytes(data: bytes, suffix: str) -> str:
    from markitdown import MarkItDown

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(data)
        path = f.name
    try:
        return MarkItDown(enable_plugins=False).convert(path).text_content or ""
    finally:
        os.unlink(path)


def _pdf_text(data: bytes) -> str:
    with fitz.open(stream=data, filetype="pdf") as doc:
        return "\n".join(page.get_text() for page in doc).strip()


def extract_text(data: bytes, filename: str = "contract.pdf") -> str:
    """Extract text from an uploaded document, dispatching on its extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        text = _pdf_text(data)
    elif ext in (".docx", ".doc"):
        text = _markitdown_bytes(data, ".docx").strip()
    elif ext in (".txt", ".md", ".text"):
        text = data.decode("utf-8", errors="replace").strip()
    else:
        # Best effort for anything else MarkItDown might understand
        text = _markitdown_bytes(data, ext or ".bin").strip()

    if len(text) < MIN_CHARS:
        raise EmptyPdfError(
            "Couldn't extract readable text from this file. If it's a scanned "
            "image, paste the contract text instead."
        )
    return text


def clean_pasted_text(text: str) -> str:
    """Validate and normalize contract text pasted directly by the user."""
    text = text.strip()
    if len(text) < MIN_CHARS:
        raise EmptyPdfError(
            "That looks too short to be a contract. Paste the full text "
            "(at least a few clauses)."
        )
    return text
