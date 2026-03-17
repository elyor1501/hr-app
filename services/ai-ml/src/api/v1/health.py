from fastapi import APIRouter
import logging

from core.config import settings
from services.embeddings.service import EmbeddingService
# from services.embeddings.local_client import LocalEmbeddingClient
from services.embeddings.cache import EmbeddingCache


router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# LIVENESS
# ---------------------------------------------------------

@router.get("/health")
async def health_check():
    """
    Liveness probe.
    Service is running.
    """
    return {
        "status": "healthy",
        "service": settings.service_name,
        "environment": settings.environment,
    }


# ---------------------------------------------------------
# READINESS
# ---------------------------------------------------------

@router.get("/ready")
async def readiness_check():
    """
    Readiness probe.
    Verifies:
    - At least one embedding provider available
    - Local fallback model loaded
    - Redis cache reachable
    """

    provider_status = {
        "gemini_configured": bool(settings.gemini_api_key),
    }

    local_status = False
    redis_status = False
    service_status = False

    # Check Local Model Load
    try:
        local_client = LocalEmbeddingClient()
        local_status = True
    except Exception as e:
        logger.error(f"Local model failed to initialize: {e}")

    # Check Redis Connectivity
    try:
        cache = EmbeddingCache()
        cache.ping()  # You should implement ping() if not already
        redis_status = True
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    # Check EmbeddingService Instantiation
    try:
        EmbeddingService()
        service_status = True
    except Exception as e:
        logger.error(f"EmbeddingService failed to initialize: {e}")

    ready = any(
        [
            provider_status["gemini_configured"],
            local_status,  # fallback is acceptable
        ]
    ) and redis_status and service_status

    return {
        "ready": ready,
        "providers": provider_status,
        "local_model_loaded": local_status,
        "redis_connected": redis_status,
        "embedding_service_initialized": service_status,
    }