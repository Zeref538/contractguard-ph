"""Pipeline unit tests using fakes — no Azure/MongoDB credentials needed."""

import fitz
import pytest

from app.ingest import EmptyPdfError, extract_text
from app.pipeline import MISSING_RULES, flag_missing
from app.schemas import REQUIRED_CATEGORIES, ClauseCategory, Verdict
from app.verdict import format_rules


def make_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return doc.tobytes()


SAMPLE = (
    "EMPLOYMENT CONTRACT\n"
    "1. The Employee shall undergo a probationary period of six (6) months.\n"
    "2. The Employee shall receive a monthly salary of PHP 25,000 plus "
    "13th month pay.\n" * 5
)


class TestExtractText:
    def test_extracts_text(self):
        text = extract_text(make_pdf(SAMPLE))
        assert "probationary period" in text

    def test_rejects_empty_pdf(self):
        with pytest.raises(EmptyPdfError):
            extract_text(make_pdf(" "))


class TestMissingClauses:
    def test_all_required_flagged_when_nothing_seen(self):
        reports = flag_missing(set())
        assert {r.clause_type for r in reports} == set(REQUIRED_CATEGORIES)
        assert all(r.verdict == Verdict.missing for r in reports)
        assert all(r.citation for r in reports)
        assert all(r.clause_text is None for r in reports)

    def test_seen_categories_not_flagged(self):
        seen = {ClauseCategory.pay, ClauseCategory.probation}
        reports = flag_missing(seen)
        flagged = {r.clause_type for r in reports}
        assert not flagged & seen
        assert flagged == set(REQUIRED_CATEGORIES) - seen

    def test_ip_never_required(self):
        assert ClauseCategory.ip not in {r.clause_type for r in flag_missing(set())}
        assert ClauseCategory.ip not in MISSING_RULES


class TestFormatRules:
    def test_includes_citation_and_text(self):
        block = format_rules([
            {"citation": "Labor Code, Art. 296 [281]",
             "title": "Probationary employment",
             "text": "Probationary employment shall not exceed six months."},
        ])
        assert "[Labor Code, Art. 296 [281]]" in block
        assert "six months" in block
