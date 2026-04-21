import logging

from fastapi import APIRouter

from core.config import settings
from services.embeddings.service import EmbeddingService
from services.embeddings.cache import EmbeddingCache


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.service_name,
        "environment": settings.environment,
    }


@router.get("/ready")
async def readiness_check():
    redis_status = False
    service_status = False

    try:
        cache = EmbeddingCache()
        redis_status = cache.use_redis
    except Exception as e:
        logger.error(f"Redis unreachable: {e}")

    try:
        EmbeddingService()
        service_status = True
    except Exception as e:
        logger.error(f"EmbeddingService failed to initialise: {e}")

    gemini_configured = bool(settings.gemini_api_key)
    ready = gemini_configured and redis_status and service_status

    return {
        "ready": ready,
        "providers": {"gemini_configured": gemini_configured},
        "redis_connected": redis_status,
        "embedding_service_initialized": service_status,
    }