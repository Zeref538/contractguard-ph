"""Embed the finalized rules and upsert them into MongoDB Atlas.

Prerequisites:
  1. kb/rules/rules.json exists (run parse_rules.py first)
  2. .env is filled in (see .env.example)

Creates the vector search index automatically if it doesn't exist yet.
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AzureOpenAI
from pymongo import MongoClient, ReplaceOne

from setup_indexes import COLLECTION, DB_NAME, ensure_vector_index

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
    coll = MongoClient(os.environ["MONGODB_URI"])[DB_NAME][COLLECTION]

    rules = json.loads(RULES_FILE.read_text(encoding="utf-8"))
    print(f"embedding {len(rules)} rules with {embed_deployment} ...")

    for start in range(0, len(rules), BATCH):
        batch = rules[start:start + BATCH]
        # Embed citation + title + text so category-flavored queries match well
        inputs = [f"{r['citation']} — {r['title']}\n{r['text']}" for r in batch]
        resp = openai_client.embeddings.create(model=embed_deployment, input=inputs)
        ops = [
            ReplaceOne(
                {"_id": rule["id"]},
                {**{k: v for k, v in rule.items() if k != "id"},
                 "_id": rule["id"], "embedding": item.embedding},
                upsert=True,
            )
            for rule, item in zip(batch, resp.data)
        ]
        coll.bulk_write(ops)
        print(f"  upserted {start + len(batch)}/{len(rules)}")

    print(f"done — rules collection now holds {coll.count_documents({})} docs")
    ensure_vector_index(coll)


if __name__ == "__main__":
    main()
