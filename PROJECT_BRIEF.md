# ContractGuard PH — Employment Contract Compliance Checker

## What this project is
A RAG system that takes an uploaded Philippine employment contract (PDF), segments it into clauses, checks each clause against DOLE Labor Code provisions retrieved from a curated knowledge base, and outputs a fixed-schema compliance report (Missing / Non-compliant / Compliant / Vague, each with citation + plain-English explanation). Not a chatbot — a fixed input → fixed structured output tool.

## Scope for v1 (locked)
- Employment contracts only (not freelance/service agreements — different legal basis)
- Philippine Labor Code + relevant DOLE Department Orders + PD 851 (13th month pay)
- Clause categories to check: probation period, termination/notice, working hours/overtime, 13th month pay, SSS/PhilHealth/Pag-IBIG benefits, IP ownership (if present), dispute resolution

## Tech stack (locked)
- LLM + embeddings: Azure OpenAI (GPT-4o-mini generation, text-embedding-3-small embeddings) via Azure AI Foundry, using student credit
- Orchestration: LangChain (LCEL, Pydantic structured output)
- Vector DB: MongoDB Atlas Vector Search (changed from Supabase pgvector)
- Backend: FastAPI in Docker, deployed on Render (HF Spaces now needs PRO for Docker)
- Frontend: React + Vite, stripped-down shadcn-admin template (https://github.com/satnaing/shadcn-admin), deployed on Vercel
- PDF parsing: PyMuPDF (contracts), requests + BeautifulSoup (scraping DOLE source PDFs)

## Architecture
```
Contract PDF
    → PyMuPDF text extraction
    → LLM clause segmentation (structured output: [{clause_type, text}])
    → Per-clause-type retriever (MongoDB Atlas Vector Search, filtered by clause_type)
    → LangChain verdict chain (Pydantic schema: verdict, citation, explanation)
    → Structured JSON report → React table view
```

Knowledge base (separate pipeline, built once, updated occasionally):
```
DOLE source PDFs (Labor Code, DOs, PD 851)
    → scrape/download
    → parse into rule chunks (article #, title, text, clause_category tag)
    → manual review/clean pass
    → embed (Azure OpenAI) → MongoDB Atlas Vector Search
```

## Week-by-week task breakdown

### Week 1 — Knowledge base
- [ ] Identify and download official DOLE source documents: Labor Code of the Philippines (full text), DO 174 (contracting/subcontracting), DO 18-A, PD 851 (13th month pay), any IRR on termination/probation
- [ ] Write scraper/parser script to extract structured rule chunks from these PDFs (article number, title, raw text)
- [ ] Tag each chunk with a clause_category (probation / termination / pay / benefits / hours / ip / dispute)
- [ ] Manually review and clean the auto-parsed chunks — fix OCR errors, merge fragmented articles, discard irrelevant chunks
- [ ] Finalize ~50-100 rule entries as a JSON file (source of truth before embedding)
- [ ] Generate embeddings via Azure OpenAI text-embedding-3-small
- [ ] Load rules + embeddings into MongoDB Atlas, vector index filterable by clause_category

### Week 2 — Core pipeline
- [ ] Build contract PDF ingestion (PyMuPDF text extraction, handle multi-page contracts)
- [ ] Build clause segmentation chain: prompt Azure OpenAI (via LangChain) to split raw contract text into typed clauses, structured output validated against a Pydantic model
- [ ] Build per-clause-type retriever: for each segmented clause, query MongoDB Atlas Vector Search filtered to that clause's category only (not a global search)
- [ ] Build verdict generation chain: given a clause + retrieved rule(s), output {verdict, citation, explanation} via Pydantic structured output, enforcing citation is always present
- [ ] Handle the "missing clause" case: if a required clause_category (e.g., 13th month pay) is never found in the segmented output, auto-flag as Missing without needing retrieval

### Week 3 — Evaluation + shipping
- [ ] Collect 15-20 real or realistic sample employment contracts (mix of compliant and non-compliant, varied formatting)
- [ ] Hand-label expected verdicts + citations for each contract (ground truth eval set)
- [ ] Write evaluator script: clause-detection precision/recall, citation accuracy (does the cited article actually exist and match), verdict accuracy against ground truth
- [ ] Run eval, record baseline numbers
- [ ] Build FastAPI endpoints: POST /analyze (upload PDF → structured JSON report), deploy to Render
- [ ] Fork shadcn-admin, strip to two screens: upload page, report view (table with clause/verdict/citation/explanation columns)
- [ ] Wire frontend to backend API, deploy to Vercel

### Week 4 — Polish (buffer)
- [ ] If eval numbers are weak: try reranking retrieved rules before verdict generation
- [ ] Write README: problem statement, architecture diagram, eval numbers (before/after any tuning), scope limitations (employment contracts only, PH Labor Code only, not legal advice disclaimer)
- [ ] Record a short demo video/gif
- [ ] Handle edge cases: scanned/image-only PDFs, multi-employer contracts, non-standard section numbering

## Explicit non-goals for v1 (do not build these)
- No support for freelance/independent contractor agreements (different legal framework — DOLE protections don't apply)
- No open-ended chat interface — output is always the fixed-schema report
- No multi-language support (English contracts only for v1)
- No legal advice disclaimer bypass — every report must state it is not a substitute for legal counsel

## Deliverables checklist
- [ ] Working deployed demo (Vercel frontend + Render backend)
- [ ] GitHub repo with clean README, architecture diagram, eval numbers
- [ ] Eval report showing precision/recall/citation-accuracy metrics
- [ ] Short demo video
