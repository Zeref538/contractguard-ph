"""Embed the finalized rules and upsert them into Supabase pgvector.

Prerequisites:
  1. kb/rules/rules.json exists (run parse_rules.py first)
  2. kb/supabase_schema.sql has been run in the Supabase SQL editor
  3. .env is filled in (see .env.example)
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AzureOpenAI
from supabase import create_client

KB_DIR = Path(__file__).resolve().parents[1]
RULES_FILE = KB_DIR / "rules" / "rules.json"
BATCH = 32


def main() -> None:
    load_dotenv(KB_DIR.parent / ".env")

    openai_client = AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
    )
    embed_deployment = os.environ.get(
        "AZURE_OPENAI_EMBED_DEPLOYMENT", "text-embedding-3-small"
    )
    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    rules = json.loads(RULES_FILE.read_text(encoding="utf-8"))
    print(f"embedding {len(rules)} rules with {embed_deployment} ...")

    for start in range(0, len(rules), BATCH):
        batch = rules[start:start + BATCH]
        # Embed citation + title + text so category-flavored queries match well
        inputs = [f"{r['citation']} — {r['title']}\n{r['text']}" for r in batch]
        resp = openai_client.embeddings.create(model=embed_deployment, input=inputs)
        rows = [
            {**rule, "embedding": item.embedding}
            for rule, item in zip(batch, resp.data)
        ]
        supabase.table("rules").upsert(rows).execute()
        print(f"  upserted {start + len(batch)}/{len(rules)}")

    count = supabase.table("rules").select("id", count="exact").execute().count
    print(f"done — rules table now holds {count} rows")


if __name__ == "__main__":
    main()
