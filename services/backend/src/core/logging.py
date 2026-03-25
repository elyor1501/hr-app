# src/core/logging.py
"""Enhanced structured logging with request ID and data masking."""

import logging
import re
import sys
from contextvars import ContextVar
from typing import Any, Dict, List, Optional

import structlog

from src.core.config import settings

# Context variable for request ID propagation
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def get_request_id() -> Optional[str]:
    """Get current request ID from context."""
    return request_id_ctx.get()


def set_request_id(request_id: str) -> None:
    """Set request ID in context."""
    request_id_ctx.set(request_id)


class SensitiveDataMasker:
    """Mask sensitive data in logs using simple string matching."""

    SENSITIVE_KEYWORDS = [
        "password", "token", "secret", "bearer", "api_key", "apikey",
        "authorization", "credential", "private_key",
    ]

    @classmethod
    def mask_string(cls, value: str) -> str:
        """Mask sensitive patterns in a string."""
        if not isinstance(value, str):
            return value
        
        masked = value
        lower = masked.lower()
        
        # Mask bearer tokens
        if "bearer " in lower:
            import re as re_mod
            masked = re_mod.sub(
                r'(?i)(bearer\s+)\S+',
                r'\1****',
                masked,
            )
        
        return masked

    @classmethod
    def mask_dict(cls, data: Dict[str, Any], sensitive_keys: List[str]) -> Dict[str, Any]:
        """Recursively mask sensitive fields in a dictionary."""
        masked = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if key matches any sensitive keyword
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
    """Add request ID to log entry."""
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def mask_sensitive_data(logger, method_name, event_dict):
    """Mask sensitive data in log entry."""
    try:
        return SensitiveDataMasker.mask_dict(event_dict, settings.log_sensitive_fields)
    except Exception:
        # Never let masking break logging
        return event_dict


def add_service_context(logger, method_name, event_dict):
    """Add service context to log entry."""
    event_dict["service"] = settings.app_name
    event_dict["environment"] = settings.environment
    return event_dict


def configure_logging() -> None:
    """Configure structured logging using structlog."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Configure root logger
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    # Build processor chain
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        add_request_id,
        add_service_context,
        mask_sensitive_data,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Use JSON in production, pretty print in development
    if settings.environment == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(
            structlog.dev.ConsoleRenderer(colors=True)
            if sys.stdout.isatty()
            else structlog.processors.JSONRenderer()
        )

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )