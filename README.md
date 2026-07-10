# Aegix AI

[![CI](https://github.com/Zeref538/aegix-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Zeref538/aegix-ai/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-aegix--ai--zeref.vercel.app-4a56be)](https://aegix-ai-zeref.vercel.app)
[![API](https://img.shields.io/badge/API-Render-46b3a9)](https://aegix-ai-api.onrender.com/health)

**AI compliance screening for Philippine employment contracts.** Upload a
contract (PDF, Word, or pasted text) and get a fixed-schema report grading
every clause — **Compliant / Non-compliant / Vague / Missing** — against the
Labor Code, PD 851, and the mandatory-benefits statutes, each verdict backed
by a citation and a plain-English explanation.

**Try it: <https://aegix-ai-zeref.vercel.app>** — sign in with Google or
continue as guest. Verdicts stream in live as each clause is judged; a full
analysis takes about a minute.

> ⚠️ Automated screening, not legal advice — consult a qualified Philippine
> labor lawyer for binding guidance. Employment contracts only;
> freelance/service agreements follow a different legal framework and are out
> of scope.
>
> ℹ️ The API runs on Render's free tier and sleeps after 15 idle minutes; the
> first analysis after a quiet spell takes ~1 extra minute while it wakes.

## What it catches

Seven clause categories: probation, termination, pay & 13th-month,
SSS/PhilHealth/Pag-IBIG, hours & overtime, IP ownership, dispute resolution.
Typical findings: a 12-month probation period (statutory max is 6), at-will
termination language (void against security of tenure), "13th-month pay
included in your salary" (an unlawful waiver under MO 28), unpaid mandated
overtime, and clauses that are missing outright.

## How it works

```
Contract (PDF / DOCX / TXT / pasted text)
    → text extraction                 PyMuPDF · mammoth
    → clause segmentation             LangChain LCEL: prompt | gpt-5-mini
                                      with_structured_output(SegmentedContract)
    → per-category rule retrieval     MongoDB Atlas $vectorSearch,
                                      pre-filtered by clause category
    → clause verdicts, in parallel    LangChain LCEL: prompt | gpt-5-mini
                                      with_structured_output(ClauseVerdict)
    → fixed-schema JSON report        verdict + citation + explanation,
                                      citation enforced per finding
```

**LangChain** is the model layer: Azure clients (`AzureChatOpenAI`,
`AzureOpenAIEmbeddings`) plus two LCEL chains whose `with_structured_output`
binds replies to Pydantic schemas — malformed model output cannot enter the
pipeline. Chains type against `BaseChatModel`, so tests inject fake models
and the whole suite runs without cloud credentials. Retrieval and
orchestration are deliberately framework-free: raw `$vectorSearch` through
pymongo and a `ThreadPoolExecutor`.

**Parallelism.** Each clause is a few network round-trips, so clauses are
judged concurrently — turning a sum of latencies into roughly the slowest
single clause (~128s → ~62s on a 9-clause contract). Transient failures
(429 / 5xx / timeouts) retry with jittered exponential backoff; 400s never
retry.

**Knowledge base** (built once): official statute texts scraped from LawPhil,
parsed into 50 category-tagged rule chunks, embedded with
`text-embedding-3-small`, and indexed in MongoDB Atlas Vector Search.
Sources: Labor Code (PD 442, dual original/renumbered citations), PD 851 +
IRR and MO 28 (13th-month pay), RA 11199 (SSS), RA 11223 (PhilHealth),
RA 9679 (Pag-IBIG), RA 8293 (IP Code).

## API

| Endpoint | Description |
|---|---|
| `POST /analyze` | Multipart file upload → full report (blocking) |
| `POST /analyze-text` | JSON `{text, filename?}` → full report (blocking) |
| `POST /analyze/stream` | File upload → Server-Sent Events |
| `POST /analyze-text/stream` | Pasted text → Server-Sent Events |
| `GET /health` | Liveness probe |

Streaming emits each verdict the moment its worker finishes:

```
event: stage      {"stage": "segmenting"}
event: segmented  {"total": 7, "clauses": [{"index": 0, "clause_type": "probation"}, …]}
event: verdict    {"index": 0, "clause": {…}}      ← arrives at ~47s
event: verdict    {"index": 6, "clause": {…}}      ← out of order, by index
event: done       {"report": {…}}                  ← same schema as /analyze
```

Workers finish out of order, so each verdict carries its index and the client
reassembles contract order — the UI shows real findings resolving live, not a
spinner. Because the response commits `200` before work begins, failures
travel as a terminal `event: error` rather than an HTTP status.

Uploads are capped at 10 MB (checked while streaming, not after buffering),
unsupported types are rejected with `415`, and a sliding-window rate limit
(`RATE_LIMIT_PER_HOUR`, default 20/IP) protects the Azure token budget.

## Evaluation

18 synthetic contracts composed from a labeled clause bank
(compliant/non-compliant/vague variants per category, plus missing-clause
cases). Metrics: clause-detection precision/recall, verdict accuracy, and
citation accuracy (the cited provision must actually exist in the knowledge
base).

| Metric | Baseline | Current |
|---|---|---|
| Clause detection precision | 100.0% | 99.0% |
| Clause detection recall | 92.3% | **100.0%** |
| Verdict accuracy | 67.2% | **84.5%** |
| Citation accuracy | 90.5% | **94.8%** |

Model unchanged throughout (gpt-5-mini). What moved the numbers:

1. **Knowledge-base gap.** The baseline judged "13th-month pay built into
   salary" as Compliant because PD 851's literal 1975 text only covers
   employees earning ≤ ₱1,000/month. A curated rule for **Memorandum Order
   28 (1986)**, which removed that ceiling, fixed it — the waiver is now
   caught.
2. **Verdict prompt calibration.** The baseline punished contract *silence*
   (an hours clause was flagged merely for not restating rest-day premium
   rates). Statutory rights apply regardless of what a contract omits, so the
   judge now grades only what a clause states.
3. **Scoring bug fix.** The harness keyed results by category, silently
   dropping duplicate-category clauses (13 across the set). Categories are
   now grouped and scored by their most severe verdict — what a reader acts
   on.

> ⚠️ Because of (3) the columns are not like-for-like: the baseline was
> scored on fewer findings than the model produced. 84.5% is the honest
> figure.

The 18 remaining verdict errors are all boundary calls — over-strictness on
compliant `hours` (10) and `benefits` (5) clauses, and Vague-vs-Non-compliant
judgement calls — with zero citation failures. Detail in `eval/results.json`
and `eval/results_baseline.json`. Reproduce: `uv run python eval/run_eval.py`.

## Stack

**Backend** — FastAPI · LangChain (LCEL + structured output) · Azure OpenAI
(gpt-5-mini, text-embedding-3-small) · MongoDB Atlas Vector Search · Docker
on Render.
**Frontend** — React 19 + Vite + Tailwind (stripped
[shadcn-admin](https://github.com/satnaing/shadcn-admin)) on Vercel · Google
sign-in via Google Identity Services, no auth backend.
**Privacy** — analysis history lives in the browser's localStorage; the
backend stores nothing about users or their contracts.

## Development

```bash
uv sync                                   # backend deps
uv run python kb/scripts/fetch_sources.py # download statute texts
uv run python kb/scripts/parse_rules.py   # build kb/rules/rules.json
# fill .env (see .env.example), then:
uv run python kb/scripts/embed_and_load.py
uv run uvicorn app.main:app --reload      # backend on :8000

cd frontend && npm install && npm run dev # frontend on :5173
```

Tests (`uv run pytest`, 33 tests) monkeypatch the pipeline behind the API and
inject fake chat models, so they need no Azure or MongoDB credentials — the
same suite runs in CI on every push alongside the frontend build.

| Variable | Where | Purpose |
|---|---|---|
| `AZURE_OPENAI_*` | backend | endpoint, key, API version, deployment names |
| `MONGODB_URI` | backend | Atlas connection string |
| `ALLOWED_ORIGINS` | backend | CORS allowlist (`*` for local dev; pinned to the Vercel origin in production) |
| `RATE_LIMIT_PER_HOUR` | backend | analyses per IP (default 20) |
| `VITE_API_URL` | frontend | backend base URL (default `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | frontend | enables Google sign-in; optional — email/guest works without it |

**Deployment** is config-as-code: `render.yaml` provisions the Dockerized API
(Singapore, health-checked on `/health`, secrets prompted rather than
committed), and Vercel builds `frontend/` on every push to `main`.

## Scope limits & known weaknesses

English-language Philippine **employment** contracts only.

- **No OCR.** Scanned/image-only documents have no text layer and are
  rejected with a prompt to paste the text instead.
- **Prompt injection.** Contract text is untrusted input that reaches the
  model. Both prompts treat clause text as data and flag instruction-like
  content as suspicious — mitigation, not proof.
- **Verdict accuracy is 84.5%,** and errors skew toward over-strictness: the
  tool is more likely to flag a lawful clause than to bless an unlawful one.
  The safer direction for a screening tool, but it is not a lawyer.
- **Retrieval is category-filtered,** so a clause mis-segmented into the
  wrong category is checked against the wrong body of law.
