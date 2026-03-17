# src/core/cache.py
"""
Redis caching service with cache-aside pattern.
"""

import hashlib
import json
from typing import Any, List, Optional

import structlog

from src.core.config import settings
from src.core.redis import get_redis_pool

logger = structlog.get_logger()


class CacheKeyBuilder:
    """Build consistent cache keys."""

    @staticmethod
    def build(namespace: str, *args, **kwargs) -> str:
        """Build a cache key from namespace and arguments."""
        parts = [settings.cache_prefix, namespace]
        
        for arg in args:
            if arg is not None:
                parts.append(str(arg))
        
        for key, value in sorted(kwargs.items()):
            if value is not None:
                parts.append(f"{key}:{value}")
        
        return ":".join(parts)

    @staticmethod
    def hash_query(query: str) -> str:
        """Create hash of search query for cache key."""
        return hashlib.md5(query.encode()).hexdigest()[:12]


class CacheService:
    """
    Redis cache service with cache-aside pattern.
    """

    NS_SEARCH = "search"
    NS_CANDIDATE = "candidate"
    NS_JOB = "job"
    NS_MATCH = "match"

    def __init__(self):
        self._stats = {"hits": 0, "misses": 0}

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not settings.cache_enabled:
            return None

        try:
            redis = await get_redis_pool()
            data = await redis.get(key)
            
            if data:
                self._stats["hits"] += 1
                logger.debug("cache_hit", key=key)
                return json.loads(data)
            
            self._stats["misses"] += 1
            logger.debug("cache_miss", key=key)
            return None
            
        except Exception as e:
            logger.warning("cache_get_error", key=key, error=str(e))
            return None

    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache."""
        if not settings.cache_enabled:
            return False

        try:
            redis = await get_redis_pool()
            serialized = json.dumps(value, default=str)
            
            if ttl:
                await redis.setex(key, ttl, serialized)
            else:
                await redis.set(key, serialized)
            
            logger.debug("cache_set", key=key, ttl=ttl)
            return True
            
        except Exception as e:
            logger.warning("cache_set_error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete a specific key from cache."""
        if not settings.cache_enabled:
            return False

        try:
            redis = await get_redis_pool()
            result = await redis.delete(key)
            logger.debug("cache_delete", key=key, deleted=result > 0)
            return result > 0
        except Exception as e:
            logger.warning("cache_delete_error", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not settings.cache_enabled:
            return 0

        try:
            redis = await get_redis_pool()
            full_pattern = f"{settings.cache_prefix}:{pattern}"
            
            deleted = 0
            cursor = 0
            while True:
                cursor, keys = await redis.scan(cursor, match=full_pattern, count=100)
                if keys:
                    deleted += await redis.delete(*keys)
                if cursor == 0:
                    break
            
            logger.info("cache_invalidate_pattern", pattern=pattern, deleted=deleted)
            return deleted
            
        except Exception as e:
            logger.warning("cache_invalidate_error", pattern=pattern, error=str(e))
            return 0

    async def invalidate_candidate(self, candidate_id: str) -> None:
        """Invalidate all caches related to a candidate."""
        await self.delete_pattern(f"candidate:{candidate_id}*")
        await self.delete_pattern("search:*")

    async def invalidate_job(self, job_id: str) -> None:
        """Invalidate all caches related to a job."""
        await self.delete_pattern(f"job:{job_id}*")
        await self.delete_pattern(f"match:*{job_id}*")

    async def invalidate_search(self) -> None:
        """Invalidate all search caches."""
        await self.delete_pattern("search:*")

    def get_stats(self) -> dict:
        """Get cache statistics."""
        total = self._stats["hits"] + self._stats["misses"]
        hit_rate = (self._stats["hits"] / total * 100) if total > 0 else 0
        return {
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "hit_rate": round(hit_rate, 2),
        }

    # Convenience methods
    async def get_search_results(self, query_hash: str) -> Optional[List[dict]]:
        key = CacheKeyBuilder.build(self.NS_SEARCH, query_hash)
        return await self.get(key)

    async def set_search_results(self, query_hash: str, results: List[dict]) -> bool:
        key = CacheKeyBuilder.build(self.NS_SEARCH, query_hash)
        return await self.set(key, results, settings.cache_search_ttl)

    async def get_candidate(self, candidate_id: str) -> Optional[dict]:
        key = CacheKeyBuilder.build(self.NS_CANDIDATE, candidate_id)
        return await self.get(key)

    async def set_candidate(self, candidate_id: str, data: dict) -> bool:
        key = CacheKeyBuilder.build(self.NS_CANDIDATE, candidate_id)
        return await self.set(key, data, settings.cache_detail_ttl)

    async def get_job(self, job_id: str) -> Optional[dict]:
        key = CacheKeyBuilder.build(self.NS_JOB, job_id)
        return await self.get(key)

    async def set_job(self, job_id: str, data: dict) -> bool:
        key = CacheKeyBuilder.build(self.NS_JOB, job_id)
        return await self.set(key, data, settings.cache_detail_ttl)

    async def get_match(self, candidate_id: str, job_id: str) -> Optional[dict]:
        key = CacheKeyBuilder.build(self.NS_MATCH, candidate_id, job_id)
        return await self.get(key)

    async def set_match(self, candidate_id: str, job_id: str, data: dict) -> bool:
        key = CacheKeyBuilder.build(self.NS_MATCH, candidate_id, job_id)
        return await self.set(key, data, settings.cache_match_ttl)


# Global cache instance
cache = CacheService()


def get_cache() -> CacheService:
    """Dependency for cache service."""
    return cache