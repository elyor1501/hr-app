import os
import time
from typing import Optional


import redis


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""


class RateLimiter:
    """
    Redis-based sliding window rate limiter.
    Limits number of embedding API calls per client per time window.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        window_seconds: int = 60,
        max_requests: int = 100,
    ):
        if redis_url:
            self.redis_url = redis_url
        else:
            host = os.getenv("REDIS_HOST", "localhost")
            port = os.getenv("REDIS_PORT", "6379")
            db = os.getenv("REDIS_DB", "0")
            self.redis_url = f"redis://{host}:{port}/{db}"

        self.window_seconds = window_seconds
        self.max_requests = max_requests

        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
            )
            self.client.ping()
            self.use_redis = True
        except Exception:
            # If Redis unavailable, limiter disables gracefully
            self.use_redis = False


    def check(self, client_id: str = "global"):
        """
        Checks if client is within rate limit.
        Raises RateLimitExceeded if limit exceeded.
        """

        if not self.use_redis:
            return  # fail open if Redis unavailable

        current_window = int(time.time() // self.window_seconds)
        key = f"rate_limit:{client_id}:{current_window}"

        count = self.client.incr(key)

        if count == 1:
            self.client.expire(key, self.window_seconds)

        if count > self.max_requests:
            raise RateLimitExceeded(
                f"Rate limit exceeded ({self.max_requests} per {self.window_seconds}s)"
            )
