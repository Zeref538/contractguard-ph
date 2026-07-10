"""Retry helper for transient Azure OpenAI failures.

Covers rate limits (429), connection drops, timeouts, 5xx, and the 404 that
freshly-created Azure deployments return while they propagate.
"""

import random
import time
from typing import Callable, TypeVar

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    NotFoundError,
    RateLimitError,
)

T = TypeVar("T")

RETRYABLE = (
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    NotFoundError,
)


def with_retry(fn: Callable[[], T], attempts: int = 4, base: float = 1.6) -> T:
    """Call fn(), retrying transient API errors with exponential backoff."""
    for i in range(attempts):
        try:
            return fn()
        except RETRYABLE:
            if i == attempts - 1:
                raise
            # jitter avoids thundering-herd when clauses run in parallel
            time.sleep(base**i + random.random() * 0.4)
    raise AssertionError("unreachable")
