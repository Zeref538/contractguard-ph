"""End-to-end analysis pipeline: document/text -> ComplianceReport.

Two entry points per input type:
  analyze_*        blocking, returns the finished report
  analyze_*_stream generator, yields (event, payload) as each clause resolves
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Iterator

from langchain_core.language_models import BaseChatModel

from app.ingest import clean_pasted_text, extract_text
from app.retriever import retrieve_rules
from app.schemas import (
    REQUIRED_CATEGORIES,
    Clause,
    ClauseCategory,
    ClauseReport,
    ComplianceReport,
    Verdict,
)
from app.segmentation import segment_contract
from app.verdict import judge_clause

# Canonical citation + explanation used when a required category never
# appears in the contract (no retrieval needed — flagged deterministically).
MISSING_RULES: dict[ClauseCategory, tuple[str, str]] = {
    ClauseCategory.probation: (
        "Labor Code, Art. 296 [281]",
        "The contract does not state whether employment is probationary or "
        "regular, or the standards for regularization. Without agreed "
        "standards made known at hiring, the employee is deemed regular "
        "from day one.",
    ),
    ClauseCategory.termination: (
        "Labor Code, Arts. 294-302 [279-287]",
        "The contract has no termination clause. Grounds and due-process "
        "requirements for dismissal, and the 30-day notice rules, are not "
        "addressed.",
    ),
    ClauseCategory.pay: (
        "PD 851; Labor Code, Arts. 97-103",
        "The contract does not specify compensation terms such as wage "
        "amount, payment schedule, or the mandatory 13th-month pay.",
    ),
    ClauseCategory.benefits: (
        "RA 11199; RA 11223; RA 9679",
        "The contract does not mention the mandatory SSS, PhilHealth, and "
        "Pag-IBIG coverage and contributions required of every private "
        "employer.",
    ),
    ClauseCategory.hours: (
        "Labor Code, Arts. 83-96",
        "The contract does not define working hours, overtime pay, rest "
        "days, or holiday pay entitlements.",
    ),
    ClauseCategory.dispute: (
        "Labor Code, Art. 224 [217]",
        "The contract has no dispute-resolution clause. Employees retain "
        "the right to bring money claims and illegal-dismissal cases to "
        "the NLRC/Labor Arbiters regardless.",
    ),
}


def analyze_contract(data: bytes, filename: str,
                     llm: BaseChatModel | None = None) -> ComplianceReport:
    """Analyze an uploaded document (PDF/DOCX/TXT)."""
    return _analyze(extract_text(data, filename), filename, llm)


def analyze_text(text: str, filename: str = "Pasted text",
                 llm: BaseChatModel | None = None) -> ComplianceReport:
    """Analyze contract text pasted directly by the user."""
    return _analyze(clean_pasted_text(text), filename, llm)


# Clauses are independent, and each is a few network round-trips (embed →
# vector search → verdict). Running them concurrently turns a serial
# sum-of-latencies into roughly the slowest single clause.
MAX_WORKERS = 8


def _judge_one(clause: Clause, llm: BaseChatModel | None) -> ClauseReport:
    rules = retrieve_rules(clause.text, clause.clause_type)
    verdict = judge_clause(clause, rules, llm)
    if verdict.verdict == Verdict.missing:
        # "Missing" is reserved for absent categories; a present clause the
        # judge can't verify is Vague.
        verdict.verdict = Verdict.vague
    return ClauseReport(
        clause_type=clause.clause_type,
        clause_text=clause.text,
        verdict=verdict.verdict,
        citation=verdict.citation,
        explanation=verdict.explanation,
    )


def _analyze(text: str, filename: str,
             llm: BaseChatModel | None) -> ComplianceReport:
    segmented = segment_contract(text, llm)

    clauses = [c for c in segmented.clauses
               if c.clause_type != ClauseCategory.other]  # 'other' is v1 scope
    seen = {c.clause_type for c in clauses}

    if clauses:
        workers = min(MAX_WORKERS, len(clauses))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            # map preserves input order, so the report follows contract order
            reports = list(pool.map(lambda c: _judge_one(c, llm), clauses))
    else:
        reports = []

    # Contract order for present clauses, then deterministic Missing flags
    reports.extend(flag_missing(seen))
    return ComplianceReport(filename=filename, clauses=reports)


Event = tuple[str, dict]


def analyze_contract_stream(data: bytes, filename: str,
                            llm: BaseChatModel | None = None) -> Iterator[Event]:
    """Stream an uploaded document's analysis (PDF/DOCX/TXT)."""
    yield from _analyze_stream(extract_text(data, filename), filename, llm)


def analyze_text_stream(text: str, filename: str = "Pasted text",
                        llm: BaseChatModel | None = None) -> Iterator[Event]:
    """Stream analysis of contract text pasted directly by the user."""
    yield from _analyze_stream(clean_pasted_text(text), filename, llm)


def _analyze_stream(text: str, filename: str,
                    llm: BaseChatModel | None) -> Iterator[Event]:
    """Yield progress events, emitting each verdict as its worker completes.

    Clauses finish out of order, so each verdict carries its index and the
    client reassembles contract order. The final 'done' event carries the
    same fixed-schema report the blocking endpoint returns.
    """
    yield "stage", {"stage": "segmenting"}
    segmented = segment_contract(text, llm)

    clauses = [c for c in segmented.clauses
               if c.clause_type != ClauseCategory.other]
    seen = {c.clause_type for c in clauses}

    yield "segmented", {
        "total": len(clauses),
        "clauses": [
            {"index": i, "clause_type": c.clause_type.value}
            for i, c in enumerate(clauses)
        ],
    }

    results: list[ClauseReport | None] = [None] * len(clauses)
    if clauses:
        workers = min(MAX_WORKERS, len(clauses))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(_judge_one, c, llm): i for i, c in enumerate(clauses)
            }
            for future in as_completed(futures):
                i = futures[future]
                report = future.result()  # re-raises worker errors here
                results[i] = report
                yield "verdict", {
                    "index": i,
                    "clause": report.model_dump(mode="json"),
                }

    missing = flag_missing(seen)
    ordered = [r for r in results if r is not None] + missing
    report = ComplianceReport(filename=filename, clauses=ordered)
    yield "done", {"report": report.model_dump(mode="json")}


def flag_missing(seen: set[ClauseCategory]) -> list[ClauseReport]:
    """Deterministic Missing verdicts for absent required categories."""
    return [
        ClauseReport(
            clause_type=cat,
            clause_text=None,
            verdict=Verdict.missing,
            citation=MISSING_RULES[cat][0],
            explanation=MISSING_RULES[cat][1],
        )
        for cat in REQUIRED_CATEGORIES
        if cat not in seen
    ]
