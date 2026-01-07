from fastapi import APIRouter

from src.core.config import settings


router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Liveness check.
    # Confirms the service is up and running.
    """
    return {
        "status": "healthy",
        "service": settings.service_name,
        "environment": settings.environment,
    }


@router.get("/ready")
async def readiness_check():
    """
    Readiness check.
    Confirms the service is ready to accept traffic.
    """
    providers_configured = any(
        [
            settings.openai_api_key,
            settings.gemini_api_key,
        ]
    )

    return {
        "ready": providers_configured,
        "providers": {
            "openai": bool(settings.openai_api_key),
            "gemini": bool(settings.gemini_api_key),
        },
    }
