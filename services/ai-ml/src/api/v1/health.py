from fastapi import APIRouter
import logging

from core.config import settings
from services.embeddings.service import EmbeddingService
from services.embeddings.local_client import LocalEmbeddingClient
from services.embeddings.cache import EmbeddingCache


router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# LIVENESS
# ---------------------------------------------------------

@router.get("/health")
async def health_check():
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
    local_status = False
    redis_status = False
    service_status = False

    try:
        LocalEmbeddingClient()
        local_status = True
    except Exception as e:
        logger.error(f"Local model failed to initialize: {e}")

    try:
        cache = EmbeddingCache()
        cache.ping()
        redis_status = True
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    try:
        EmbeddingService()
        service_status = True
    except Exception as e:
        logger.error(f"EmbeddingService failed to initialize: {e}")

    ready = local_status and redis_status and service_status

    return {
        "ready": ready,
        "local_model_loaded": local_status,
        "redis_connected": redis_status,
        "embedding_service_initialized": service_status,
    }
