# Aegix AI

[![CI](https://github.com/Zeref538/aegix-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Zeref538/aegix-ai/actions/workflows/ci.yml)

**Philippine employment contract compliance checker.** Upload an employment
contract (PDF, Word, or pasted text); get a fixed-schema report grading each
clause — **Compliant / Non-compliant / Vague / Missing** — against the Labor
Code, PD 851, and mandatory-benefits statutes, with a citation and a
plain-English explanation for every verdict.

> ⚠️ Not legal advice, and not a substitute for a qualified Philippine labor
> lawyer. Employment contracts only (freelance/service agreements are out of
> scope — different legal framework).

## Architecture

```
Contract (PDF / DOCX / TXT / pasted text)
    → text extraction (PyMuPDF · mammoth)
    → LLM clause segmentation (gpt-5-mini, Pydantic structured output)
    → per-clause-type retrieval (MongoDB Atlas Vector Search, category-filtered)
    → verdict chain, clauses judged in parallel
      (verdict + citation + explanation, citation enforced)
    → fixed-schema JSON report → React report view
```

Clause verdicts run concurrently in a thread pool: each clause is a few
network round-trips, so this turns a sum-of-latencies into roughly the slowest
single clause (~128s → ~62s on a 9-clause contract). Every LLM and embedding
call retries transient failures (429 / 5xx / timeouts) with jittered backoff,
but never retries a 400.

### Streaming

`POST /analyze/stream` and `/analyze-text/stream` return **Server-Sent Events**,
emitting each verdict the moment its worker finishes rather than blocking for
the full run:

```
event: stage      {"stage": "segmenting"}
event: segmented  {"total": 7, "clauses": [{"index": 0, "clause_type": "probation"}, …]}
event: verdict    {"index": 0, "clause": {…}}      ← arrives at ~47s
event: verdict    {"index": 6, "clause": {…}}      ← out of order, by index
…
event: done       {"report": {…}}                  ← same fixed schema as /analyze
```

Workers complete out of order, so each verdict carries its index and the client
reassembles contract order. The UI shows real findings resolving live instead of
a spinner. Because the response commits a `200` before work begins, failures
travel as a terminal `event: error` rather than an HTTP status. The blocking
`/analyze` and `/analyze-text` endpoints remain for non-streaming clients.

Knowledge base (built once): official statute texts scraped from LawPhil →
parsed into 50 tagged rule chunks (`kb/rules/rules.json`) → embedded with
`text-embedding-3-small` → MongoDB Atlas Vector Search, filterable by clause category.

**Sources:** Labor Code (PD 442, dual original/renumbered citations), PD 851 +
IRR (13th-month pay), RA 11199 (SSS), RA 11223 (PhilHealth), RA 9679
(Pag-IBIG), RA 8293 (IP Code).

## Stack

Azure OpenAI (gpt-5-mini + text-embedding-3-small) · LangChain · MongoDB
Atlas Vector Search · FastAPI on Hugging Face Spaces · React + Vite (stripped
[shadcn-admin](https://github.com/satnaing/shadcn-admin)) on Vercel.

## Evaluation

18 synthetic contracts composed from a labeled clause bank
(compliant/non-compliant/vague variants per category, plus missing-clause
cases). Metrics: clause-detection precision/recall, verdict accuracy,
citation accuracy (cited provision must exist in the knowledge base).

| Metric | Baseline | Current |
|---|---|---|
| Clause detection precision | 100.0% | 99.0% |
| Clause detection recall | 92.3% | **100.0%** |
| Verdict accuracy | 67.2% | **84.5%** |
| Citation accuracy | 90.5% | **94.8%** |

Model unchanged throughout (gpt-5-mini). What moved the numbers:

1. **Knowledge-base gap.** The baseline judged "13th-month pay built into
   salary" as Compliant, because PD 851's literal 1975 text only covers
   employees earning ≤ ₱1,000/month. Added a curated rule for **Memorandum
   Order 28 (1986)**, which removed that ceiling — the waiver is now caught.
2. **Verdict prompt calibration.** The baseline judge punished contract
   *silence* (an hours clause was flagged merely for not restating rest-day
   premium rates). Statutory rights apply regardless of what a contract omits,
   so the prompt now judges only what a clause actually states.
3. **Scoring bug fix.** The harness keyed results by clause category, so when
   a contract produced two clauses of one category (13 cases across the set)
   all but the last were silently discarded. Categories are now grouped and
   scored by their **most severe** verdict — what a reader actually acts on.

> ⚠️ Because of (3) the two columns are not a like-for-like comparison: the
> baseline was scored on fewer findings than the model produced. The 84.5% is
> the honest figure.

The 18 remaining verdict errors are all boundary calls, not citation failures —
mostly over-strictness on compliant `hours` (10) and `benefits` (5) clauses,
and Vague-vs-Non-compliant judgement calls. Detail in `eval/results.json`
(current) and `eval/results_baseline.json`.

Reproduce: `uv run python eval/run_eval.py`

## Local development

```bash
uv sync                                   # backend deps
uv run python kb/scripts/fetch_sources.py # download statute texts
uv run python kb/scripts/parse_rules.py   # build kb/rules/rules.json
# fill .env (see .env.example), then:
uv run python kb/scripts/embed_and_load.py
uv run uvicorn app.main:app --reload      # backend on :8000

cd frontend && npm install && npm run dev # frontend on :5173
```

Tests: `uv run pytest`

## Scope limits & known weaknesses (v1)

English-language Philippine **employment** contracts only. Checks: probation,
termination, pay/13th month, SSS/PhilHealth/Pag-IBIG, hours/overtime, IP
ownership (when present), dispute resolution.

- **No OCR.** Scanned/image-only documents have no text layer and are rejected
  with a prompt to paste the text instead.
- **Prompt injection.** Contract text is untrusted input that reaches the
  model. Both prompts instruct it to treat clause text as data and flag
  instruction-like content as suspicious, but this is mitigation, not a proof.
- **Verdict accuracy is 84.5%,** and errors skew toward over-strictness — the
  tool is more likely to flag a lawful clause than to bless an unlawful one.
  That is the safer direction for a screening tool, but it is not a lawyer.
- **Retrieval is category-filtered,** so a clause mis-segmented into the wrong
  category is checked against the wrong body of law.

## Operations

`ALLOWED_ORIGINS` restricts CORS (defaults to `*` for local dev — set it to the
deployed frontend origin). `RATE_LIMIT_PER_HOUR` (default 20) caps analyses per
IP, since each one spends Azure tokens. Uploads are capped at 10 MB while
streaming, rather than buffered then rejected.
