# src/core/redis.py
"""
Redis connection pool for caching, rate limiting, and job queue.
"""

from typing import Optional

import redis.asyncio as redis
import structlog

from src.core.config import settings

logger = structlog.get_logger()

# Global Redis pool
_redis_pool: Optional[redis.Redis] = None


async def get_redis_pool() -> redis.Redis:
    """Get or create Redis connection pool."""
    global _redis_pool
    
    if _redis_pool is None:
        _redis_pool = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=0,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30,
        )
        logger.info(
            "Redis pool created",
            host=settings.redis_host,
            port=settings.redis_port,
        )
    
    return _redis_pool


async def close_redis_pool() -> None:
    """Close Redis connection pool."""
    global _redis_pool
    
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Redis pool closed")


async def check_redis_connection() -> bool:
    """Check if Redis is available."""
    try:
        pool = await get_redis_pool()
        await pool.ping()
        return True
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        return False