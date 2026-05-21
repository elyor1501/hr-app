import logging
import logging.handlers
import os
import sys
import time
from contextvars import ContextVar
from typing import Any, Dict, List, Optional

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from src.core.config import settings

request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

logger = structlog.get_logger()


def get_request_id() -> Optional[str]:
    return request_id_ctx.get()


def set_request_id(request_id: str) -> None:
    request_id_ctx.set(request_id)


class SensitiveDataMasker:
    SENSITIVE_KEYWORDS = [
        "password", "token", "secret", "bearer", "api_key", "apikey",
        "authorization", "credential", "private_key",
    ]

    @classmethod
    def mask_string(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        masked = value
        lower = masked.lower()
        if "bearer " in lower:
            import re as re_mod
            masked = re_mod.sub(r'(?i)(bearer\s+)\S+', r'\1****', masked)
        return masked

    @classmethod
    def mask_dict(cls, data: Dict[str, Any], sensitive_keys: List[str]) -> Dict[str, Any]:
        masked = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(s in key_lower for s in sensitive_keys):
                masked[key] = "****"
            elif isinstance(value, dict):
                masked[key] = cls.mask_dict(value, sensitive_keys)
            elif isinstance(value, str):
                masked[key] = cls.mask_string(value)
            elif isinstance(value, list):
                masked[key] = [
                    cls.mask_dict(item, sensitive_keys) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                masked[key] = value
        return masked


def add_request_id(logger, method_name, event_dict):
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def mask_sensitive_data(logger, method_name, event_dict):
    try:
        return SensitiveDataMasker.mask_dict(event_dict, settings.log_sensitive_fields)
    except Exception:
        return event_dict


def add_service_context(logger, method_name, event_dict):
    event_dict["service"] = settings.app_name
    event_dict["environment"] = settings.environment
    return event_dict


def _setup_file_logging(log_level: int) -> None:
    log_dir = "/app/logs"
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, "backend.log")

    file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_file,
        when="midnight",
        interval=1,
        backupCount=15,
        encoding="utf-8",
        utc=True,
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter("%(message)s"))
    file_handler.suffix = "%Y-%m-%d"

    root_logger = logging.getLogger()
    root_logger.addHandler(file_handler)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import uuid
        request_id = str(uuid.uuid4())
        request_id_ctx.set(request_id)

        start_time = time.time()

        skip_paths = {"/health", "/metrics", "/favicon.ico"}
        if request.url.path in skip_paths:
            return await call_next(request)

        await logger.ainfo(
            "request_started",
            method=request.method,
            path=request.url.path,
            query=str(request.url.query) if request.url.query else None,
            client_ip=request.client.host if request.client else None,
            request_id=request_id,
        ) if hasattr(logger, 'ainfo') else logger.info(
            "request_started",
            method=request.method,
            path=request.url.path,
            query=str(request.url.query) if request.url.query else None,
            client_ip=request.client.host if request.client else None,
            request_id=request_id,
        )

        try:
            response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)

            logger.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                request_id=request_id,
            )

            return response

        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(
                "request_failed",
                method=request.method,
                path=request.url.path,
                error=str(e),
                duration_ms=duration_ms,
                request_id=request_id,
            )
            raise


def configure_logging() -> None:
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    _setup_file_logging(log_level)

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        add_request_id,
        add_service_context,
        mask_sensitive_data,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )