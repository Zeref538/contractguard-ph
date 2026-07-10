"""API surface tests — pipeline is stubbed, so no Azure/MongoDB needed."""

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from app import main
from app.ingest import EmptyPdfError
from app.schemas import ClauseReport, ClauseCategory, ComplianceReport, Verdict


def make_report(filename: str) -> ComplianceReport:
    return ComplianceReport(
        filename=filename,
        clauses=[
            ClauseReport(
                clause_type=ClauseCategory.probation,
                clause_text="Six months.",
                verdict=Verdict.compliant,
                citation="Labor Code, Art. 296 [281]",
                explanation="Within the six-month cap.",
            )
        ],
    )


def fake_stream(filename: str):
    yield "stage", {"stage": "segmenting"}
    yield "segmented", {"total": 1, "clauses": [{"index": 0, "clause_type": "probation"}]}
    report = make_report(filename)
    yield "verdict", {"index": 0, "clause": report.clauses[0].model_dump(mode="json")}
    yield "done", {"report": report.model_dump(mode="json")}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "analyze_contract", lambda data, name: make_report(name))
    monkeypatch.setattr(main, "analyze_text", lambda text, name: make_report(name))
    monkeypatch.setattr(main, "analyze_contract_stream", lambda data, name: fake_stream(name))
    monkeypatch.setattr(main, "analyze_text_stream", lambda text, name: fake_stream(name))
    main._hits.clear()  # rate limiter is process-global
    return TestClient(main.app)


def parse_sse(body: str) -> list[tuple[str, dict]]:
    import json

    events = []
    for block in body.strip().split("\n\n"):
        name, data = "message", ""
        for line in block.split("\n"):
            if line.startswith("event:"):
                name = line[6:].strip()
            elif line.startswith("data:"):
                data += line[5:].strip()
        events.append((name, json.loads(data)))
    return events


def test_stream_emits_events_in_order(client):
    r = client.post("/analyze-text/stream", json={"text": "x" * 200})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")

    events = parse_sse(r.text)
    names = [n for n, _ in events]
    assert names == ["stage", "segmented", "verdict", "done"]

    verdict = dict(events)["verdict"]
    assert verdict["index"] == 0
    assert verdict["clause"]["verdict"] == "Compliant"

    report = dict(events)["done"]["report"]
    assert report["clauses"][0]["citation"]
    assert "not legal advice" in report["disclaimer"].lower()


def test_stream_upload_rejects_bad_extension(client):
    r = client.post("/analyze/stream", files={"file": ("x.png", b"\x89PNG", "image/png")})
    assert r.status_code == 415


def test_stream_reports_failures_as_terminal_error_event(client, monkeypatch):
    def boom(text, name):
        yield "stage", {"stage": "segmenting"}
        raise EmptyPdfError("scanned image")

    monkeypatch.setattr(main, "analyze_text_stream", boom)
    r = client.post("/analyze-text/stream", json={"text": "x" * 200})

    # Status is already 200 by the time the failure happens — it must arrive
    # as an SSE error event rather than an HTTP status.
    assert r.status_code == 200
    name, payload = parse_sse(r.text)[-1]
    assert name == "error"
    assert payload["detail"] == "scanned image"


def test_stream_hides_unexpected_errors_from_clients(client, monkeypatch):
    def boom(text, name):
        raise RuntimeError("mongo credentials in the message")
        yield  # pragma: no cover

    monkeypatch.setattr(main, "analyze_text_stream", boom)
    r = client.post("/analyze-text/stream", json={"text": "x" * 200})
    name, payload = parse_sse(r.text)[-1]
    assert name == "error"
    assert "mongo credentials" not in payload["detail"]


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_analyze_accepts_pdf(client):
    r = client.post("/analyze", files={"file": ("c.pdf", b"%PDF-1.4 fake", "application/pdf")})
    assert r.status_code == 200
    assert r.json()["filename"] == "c.pdf"
    assert r.json()["clauses"][0]["citation"]


def test_analyze_accepts_docx(client):
    r = client.post("/analyze", files={"file": ("c.docx", b"PK fake", "application/octet-stream")})
    assert r.status_code == 200


def test_analyze_rejects_unsupported_extension(client):
    r = client.post("/analyze", files={"file": ("photo.png", b"\x89PNG", "image/png")})
    assert r.status_code == 415


def test_analyze_rejects_oversized_upload(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_BYTES", 1024)
    big = b"x" * 4096
    r = client.post("/analyze", files={"file": ("c.pdf", big, "application/pdf")})
    assert r.status_code == 413


def test_analyze_surfaces_unreadable_document(client, monkeypatch):
    def boom(data, name):
        raise EmptyPdfError("scanned image")

    monkeypatch.setattr(main, "analyze_contract", boom)
    r = client.post("/analyze", files={"file": ("c.pdf", b"%PDF", "application/pdf")})
    assert r.status_code == 422
    assert "scanned image" in r.json()["detail"]


def test_analyze_text_roundtrip(client):
    r = client.post("/analyze-text", json={"text": "x" * 200, "filename": "Pasted"})
    assert r.status_code == 200
    assert r.json()["filename"] == "Pasted"


def test_analyze_text_rejects_short_text(client, monkeypatch):
    def boom(text, name):
        raise EmptyPdfError("too short")

    monkeypatch.setattr(main, "analyze_text", boom)
    r = client.post("/analyze-text", json={"text": "hi"})
    assert r.status_code == 422


def test_rate_limit_blocks_after_quota(client, monkeypatch):
    monkeypatch.setattr(main, "RATE_LIMIT", 2)
    main._hits.clear()
    payload = {"text": "x" * 200}
    assert client.post("/analyze-text", json=payload).status_code == 200
    assert client.post("/analyze-text", json=payload).status_code == 200
    r = client.post("/analyze-text", json=payload)
    assert r.status_code == 429


def test_rate_limit_keys_on_forwarded_client_ip(client, monkeypatch):
    # Behind the proxy every request shares request.client; visitors must be
    # told apart by the proxy-appended X-Forwarded-For entry.
    monkeypatch.setattr(main, "RATE_LIMIT", 1)
    main._hits.clear()
    payload = {"text": "x" * 200}
    a = {"X-Forwarded-For": "203.0.113.7"}
    b = {"X-Forwarded-For": "198.51.100.9"}
    assert client.post("/analyze-text", json=payload, headers=a).status_code == 200
    assert client.post("/analyze-text", json=payload, headers=a).status_code == 429
    # A different visitor still has quota
    assert client.post("/analyze-text", json=payload, headers=b).status_code == 200


def test_rate_limit_ignores_spoofed_forwarded_prefix(client, monkeypatch):
    # Clients can prepend fake entries; the proxy appends the real IP last.
    # Rotating the fake prefix must not mint fresh quota.
    monkeypatch.setattr(main, "RATE_LIMIT", 1)
    main._hits.clear()
    payload = {"text": "x" * 200}
    first = {"X-Forwarded-For": "10.0.0.1, 203.0.113.7"}
    spoofed = {"X-Forwarded-For": "10.99.99.99, 203.0.113.7"}
    assert client.post("/analyze-text", json=payload, headers=first).status_code == 200
    assert client.post("/analyze-text", json=payload, headers=spoofed).status_code == 429


def test_report_always_carries_disclaimer(client):
    r = client.post("/analyze-text", json={"text": "x" * 200})
    assert "not legal advice" in r.json()["disclaimer"].lower()


def make_docx(paragraphs: list[str]) -> bytes:
    body = "".join(f"<w:p><w:r><w:t>{t}</w:t></w:r></w:p>" for t in paragraphs)
    doc = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org'
        f'/wordprocessingml/2006/main"><w:body>{body}</w:body></w:document>'
    )
    ct = (
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package'
        '/2006/content-types"><Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxml'
        'formats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    )
    rels = (
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org'
        '/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.'
        'openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/></Relationships>'
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("[Content_Types].xml", ct)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", doc)
    return buf.getvalue()


def test_docx_extraction_roundtrip():
    from app.ingest import extract_text

    text = extract_text(
        make_docx(["EMPLOYMENT CONTRACT", "The Employee " + "shall comply. " * 20]),
        "c.docx",
    )
    assert "EMPLOYMENT CONTRACT" in text


def test_unsupported_extension_rejected_in_ingest():
    from app.ingest import extract_text

    with pytest.raises(EmptyPdfError):
        extract_text(b"data" * 100, "contract.png")
