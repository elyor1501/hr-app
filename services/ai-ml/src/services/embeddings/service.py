from __future__ import annotations

from typing import List
import logging

from .cache import EmbeddingCache
from .rate_limiter import RateLimiter
from .exceptions import GeminiEmbeddingError
from .gemini_client import GeminiEmbeddingClient

logger = logging.getLogger(__name__)

EXPECTED_DIMENSION = 3072
MAX_BATCH_SIZE = 100


class EmbeddingService:
    def __init__(
        self,
        cache: EmbeddingCache | None = None,
        rate_limiter: RateLimiter | None = None,
        gemini_client: GeminiEmbeddingClient | None = None,
    ):
        self.cache = cache or EmbeddingCache()
        self.rate_limiter = rate_limiter or RateLimiter()

        # ✅ Gemini ONLY (fallback temporarily disabled)
        self.primary = gemini_client or GeminiEmbeddingClient()

    def get_embedding(self, text: str) -> List[float]:
        cached = self.cache.get(text)
        if cached:
            return cached

        self.rate_limiter.check("embedding_service")

        # 🚫 No fallback — Gemini must succeed
        embedding = self.primary.embed_text(text)

        self._validate_embedding(embedding)
        self.cache.set(text, embedding)

        return embedding

    # ---------- BATCH ----------

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if len(texts) > MAX_BATCH_SIZE:
            raise ValueError("Batch size cannot exceed 100")

        results: dict[str, List[float]] = {}

        cached = self.cache.get_many(texts)
        results.update(cached)

        missing = [t for t in texts if t not in cached]

        if missing:
            self.rate_limiter.check("embedding_service")

            embeddings = self.primary.embed_batch(missing)

            for text, emb in zip(missing, embeddings):
                self._validate_embedding(emb)
                self.cache.set(text, emb)
                results[text] = emb

        return [results[t] for t in texts]

    # ---------- INTERNAL ----------

    def _validate_embedding(self, embedding: List[float]):
        if len(embedding) != EXPECTED_DIMENSION:
            raise ValueError(
                f"Invalid embedding dimension: {len(embedding)}"
            )