import hashlib
import json
import os
from typing import List, Optional, Dict

import redis


DEFAULT_TTL_SECONDS = 60 * 60 * 24  # 24 hours


class EmbeddingCache:
    """
    Caches embeddings using Redis.
    Falls back to in-memory cache if Redis unavailable.
    """

    def __init__(self, redis_url: str | None = None):
        if redis_url:
            self.redis_url = redis_url
        else:
            host = os.getenv("REDIS_HOST", "localhost")
            port = os.getenv("REDIS_PORT", "6379")
            db = os.getenv("REDIS_DB", "0")
            self.redis_url = f"redis://{host}:{port}/{db}"

        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
            )
            self.client.ping()
            self.use_redis = True
        except Exception:
            self.use_redis = False
            self.memory_cache: Dict[str, List[float]] = {}

    # ==========================================================
    # INTERNAL
    # ==========================================================

    @staticmethod
    def _hash_text(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    # ==========================================================
    # SINGLE GET
    # ==========================================================

    def get(self, text: str) -> Optional[List[float]]:
        key = self._hash_text(text)

        if self.use_redis:
            try:
                value = self.client.get(key)
                if value is None:
                    return None
                return json.loads(value)
            except Exception:
                return None
        else:
            return self.memory_cache.get(key)

    # ==========================================================
    # SET
    # ==========================================================

    def set(
        self,
        text: str,
        embedding: List[float],
        ttl: int = DEFAULT_TTL_SECONDS,
    ):
        key = self._hash_text(text)

        if self.use_redis:
            try:
                self.client.setex(key, ttl, json.dumps(embedding))
            except Exception:
                pass
        else:
            self.memory_cache[key] = embedding

    # ==========================================================
    # BATCH GET
    # ==========================================================

    def get_many(self, texts: List[str]) -> Dict[str, List[float]]:
        if not texts:
            return {}

        mapping: Dict[str, List[float]] = {}

        if self.use_redis:
            try:
                keys = [self._hash_text(t) for t in texts]
                values = self.client.mget(keys)

                for text, value in zip(texts, values):
                    if value is not None:
                        mapping[text] = json.loads(value)

                return mapping
            except Exception:
                return {}
        else:
            for text in texts:
                key = self._hash_text(text)
                if key in self.memory_cache:
                    mapping[text] = self.memory_cache[key]

            return mapping
