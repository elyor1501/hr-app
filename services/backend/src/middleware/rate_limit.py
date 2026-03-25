# src/middleware/rate_limit.py
"""
Rate limiting middleware using Redis sliding window.
"""

import time
from typing import Callable, Tuple

import structlog
from fastapi import status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from src.core.config import settings
from src.core.redis import get_redis_pool

logger = structlog.get_logger()


class RateLimitConfig:
    """Rate limit configuration for different endpoint types."""

    LIMITS = {
        "auth": {
            "patterns": ["/api/v1/auth/"],
            "requests": settings.rate_limit_auth_requests,
            "window": settings.rate_limit_auth_window,
        },
        "search": {
            "patterns": ["/api/v1/search/", "/api/v1/match/"],
            "requests": settings.rate_limit_search_requests,
            "window": settings.rate_limit_search_window,
        },
        "crud": {
            "patterns": ["/api/v1/"],
            "requests": settings.rate_limit_crud_requests,
            "window": settings.rate_limit_crud_window,
        },
    }

    @classmethod
    def get_limit(cls, path: str) -> Tuple[int, int]:
        """Get rate limit for a path. Returns (requests, window_seconds)."""
        for config in cls.LIMITS.values():
            for pattern in config["patterns"]:
                if path.startswith(pattern):
                    return config["requests"], config["window"]
        return 100, 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-based sliding window rate limiter.
    """

    EXEMPT_PATHS = {"/health", "/ready", "/metrics", "/metrics/prometheus", "/docs", "/openapi.json", "/redoc", "/"}

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> JSONResponse:
        # Skip if rate limiting disabled
        if not settings.rate_limit_enabled:
            return await call_next(request)

        # Skip exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Get rate limit for this path
        max_requests, window = RateLimitConfig.get_limit(request.url.path)

        # Get identifier (user ID from token or IP)
        identifier = self._get_identifier(request)

        # Check if admin (exempt from rate limits)
        if self._is_admin(request):
            response = await call_next(request)
            response.headers["X-RateLimit-Exempt"] = "admin"
            return response

        # Check rate limit
        try:
            allowed, remaining, reset_at = await self._check_rate_limit(
                identifier=identifier,
                path=request.url.path,
                max_requests=max_requests,
                window=window,
            )
        except Exception as e:
            # If Redis fails, allow request but log warning
            logger.warning("rate_limit_check_failed", error=str(e))
            return await call_next(request)

        if not allowed:
            retry_after = max(1, int(reset_at - time.time()))
            logger.warning(
                "rate_limit_exceeded",
                identifier=identifier,
                path=request.url.path,
                retry_after=retry_after,
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(reset_at)),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_at))

        return response

    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting."""
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    def _is_admin(self, request: Request) -> bool:
        """Check if request is from admin user."""
        user_role = getattr(request.state, "user_role", None)
        return user_role == "admin"

    async def _check_rate_limit(
        self,
        identifier: str,
        path: str,
        max_requests: int,
        window: int,
    ) -> Tuple[bool, int, float]:
        """Check rate limit using Redis sliding window."""
        redis = await get_redis_pool()
        
        # Create key
        path_category = path.split('/')[3] if len(path.split('/')) > 3 else 'default'
        key = f"{settings.cache_prefix}:ratelimit:{identifier}:{path_category}"
        
        now = time.time()
        window_start = now - window

        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window)
        
        results = await pipe.execute()
        
        current_count = results[1]
        
        allowed = current_count < max_requests
        remaining = max(0, max_requests - current_count - 1)
        reset_at = now + window

        return allowed, remaining, reset_at