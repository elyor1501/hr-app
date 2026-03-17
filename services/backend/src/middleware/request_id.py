# src/middleware/request_id.py
"""
Request ID middleware for distributed tracing.
"""

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.core.logging import set_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add/propagate request ID for tracing.
    """

    HEADER_NAME = "X-Request-ID"

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # Get or generate request ID
        request_id = request.headers.get(self.HEADER_NAME)
        if not request_id:
            request_id = str(uuid.uuid4())

        # Store in context for logging
        set_request_id(request_id)

        # Store in request state for access in endpoints
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers[self.HEADER_NAME] = request_id

        return response