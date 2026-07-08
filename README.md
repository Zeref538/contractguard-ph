# Aegix AI

**Philippine employment contract compliance checker.** Upload an employment
contract PDF; get a fixed-schema report grading each clause — **Compliant /
Non-compliant / Vague / Missing** — against the Labor Code, PD 851, and
mandatory-benefits statutes, with a citation and a plain-English explanation
for every verdict.

> ⚠️ Not legal advice, and not a substitute for a qualified Philippine labor
> lawyer. Employment contracts only (freelance/service agreements are out of
> scope — different legal framework).

## Architecture

```
Contract PDF
    → PyMuPDF text extraction
    → LLM clause segmentation (GPT-4o-mini, Pydantic structured output)
    → per-clause-type retrieval (MongoDB Atlas Vector Search, category-filtered)
    → verdict chain (verdict + citation + explanation, citation enforced)
    → fixed-schema JSON report → React table view
```

Knowledge base (built once): official statute texts scraped from LawPhil →
parsed into 50 tagged rule chunks (`kb/rules/rules.json`) → embedded with
`text-embedding-3-small` → MongoDB Atlas Vector Search, filterable by clause category.

**Sources:** Labor Code (PD 442, dual original/renumbered citations), PD 851 +
IRR (13th-month pay), RA 11199 (SSS), RA 11223 (PhilHealth), RA 9679
(Pag-IBIG), RA 8293 (IP Code).

## Stack

Azure OpenAI (GPT-4o-mini + text-embedding-3-small) · LangChain · MongoDB
Atlas Vector Search · FastAPI on Hugging Face Spaces · React + Vite (stripped
[shadcn-admin](https://github.com/satnaing/shadcn-admin)) on Vercel.

## Evaluation

18 synthetic contracts composed from a labeled clause bank
(compliant/non-compliant/vague variants per category, plus missing-clause
cases). Metrics: clause-detection precision/recall, verdict accuracy,
citation accuracy (cited provision must exist in the knowledge base).

| Metric | Baseline | After tuning |
|---|---|---|
| Clause detection precision | 100.0% | 99.0% |
| Clause detection recall | 92.3% | **100.0%** |
| Verdict accuracy | 67.2% | **81.0%** |
| Citation accuracy | 90.5% | **91.4%** |

Tuning between runs (model unchanged — gpt-5-mini):
1. **KB gap fix:** baseline judged "13th-month pay built into salary" as
   Compliant because PD 851's literal 1975 text caps coverage at a ₱1,000
   salary. Added a curated rule for **Memorandum Order 28 (1986)**, which
   removed the cap — the verdict now correctly flags the waiver.
2. **Verdict prompt calibration:** the baseline judge punished contract
   *silence* (e.g. an hours clause flagged for not restating rest-day
   premium rates). Reworded to judge only what the clause states, since
   statutory rights apply regardless of contract silence.

Remaining errors are mostly borderline strictness on compliant hours/benefits
clauses and Vague-vs-Non-compliant boundary calls. Eval detail:
`eval/results.json` (tuned) and `eval/results_baseline.json`.

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

## Scope limits (v1)

English-language Philippine **employment** contracts only. Checks: probation,
termination, pay/13th month, SSS/PhilHealth/Pag-IBIG, hours/overtime, IP
ownership (when present), dispute resolution. Scanned/image-only PDFs are
rejected.
