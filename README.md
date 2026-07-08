# ContractGuard PH

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

| Metric | Score |
|---|---|
| Clause detection precision | _pending_ |
| Clause detection recall | _pending_ |
| Verdict accuracy | _pending_ |
| Citation accuracy | _pending_ |

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
