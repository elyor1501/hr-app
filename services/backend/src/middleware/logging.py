# src/middleware/logging.py
"""
Request/Response logging middleware with timing.
"""

import time
from typing import Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging requests and responses.
    """

    SKIP_PATHS = {"/health", "/ready", "/metrics", "/metrics/prometheus", "/favicon.ico"}

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # Skip health checks to reduce noise
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Extract request info
        request_info = {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.query_params) if request.query_params else None,
            "client_ip": self._get_client_ip(request),
        }

        # Log request start
        logger.info("request_started", **request_info)

        # Time the request
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "request_failed",
                **request_info,
                duration_ms=round(duration_ms, 2),
                error=str(e),
            )
            raise

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log response
        log_method = logger.info if response.status_code < 400 else logger.warning
        log_method(
            "request_completed",
            **request_info,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )

        # Add timing header
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        return response

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Extract client IP, considering proxy headers."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"