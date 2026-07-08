"""Create the Atlas Vector Search index for the rules collection.

Run once after the cluster exists (embed_and_load.py calls this too, so you
normally don't need to run it directly). Requires MONGODB_URI in .env.
"""

import os
import time
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

DB_NAME = "contractguard"
COLLECTION = "rules"
INDEX_NAME = "rules_vector_index"

VECTOR_INDEX = SearchIndexModel(
    name=INDEX_NAME,
    type="vectorSearch",
    definition={
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": 1536,  # text-embedding-3-small
                "similarity": "cosine",
            },
            {"type": "filter", "path": "clause_category"},
        ]
    },
)


def get_collection():
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    client = MongoClient(os.environ["MONGODB_URI"])
    return client[DB_NAME][COLLECTION]


def ensure_vector_index(coll) -> None:
    existing = {ix["name"] for ix in coll.list_search_indexes()}
    if INDEX_NAME in existing:
        print(f"search index {INDEX_NAME} already exists")
        return
    coll.create_search_index(model=VECTOR_INDEX)
    print(f"creating search index {INDEX_NAME} ...")
    # Atlas builds search indexes asynchronously; wait until queryable
    while True:
        info = next((ix for ix in coll.list_search_indexes()
                     if ix["name"] == INDEX_NAME), None)
        if info and info.get("queryable"):
            break
        time.sleep(3)
    print("index is queryable")


if __name__ == "__main__":
    ensure_vector_index(get_collection())
