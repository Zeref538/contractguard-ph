"""Per-clause-type retrieval from MongoDB Atlas Vector Search.

Each segmented clause is matched only against rules tagged with its own
clause_category (a $vectorSearch pre-filter) — never a global search.
"""

from app.config import get_embeddings, get_rules_collection
from app.retry import with_retry
from app.schemas import ClauseCategory

VECTOR_INDEX = "rules_vector_index"


def retrieve_rules(clause_text: str, category: ClauseCategory,
                   match_count: int = 4) -> list[dict]:
    """Return the most relevant rules for a clause, category-filtered."""
    embedding = with_retry(lambda: get_embeddings().embed_query(clause_text))
    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX,
                "path": "embedding",
                "queryVector": embedding,
                "filter": {"clause_category": category.value},
                "numCandidates": 50,
                "limit": match_count,
            }
        },
        {
            "$project": {
                "_id": 0,
                "citation": 1,
                "title": 1,
                "text": 1,
                "clause_category": 1,
                "similarity": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    return list(get_rules_collection().aggregate(pipeline))
