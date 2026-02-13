import logging
import sys

import structlog

from src.core.config import settings


def configure_logging() -> None:
    """
    Configure structured JSON logging using structlog.
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=settings.log_level,
    )

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
