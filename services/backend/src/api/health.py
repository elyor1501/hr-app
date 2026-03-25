# src/api/health.py
"""Comprehensive health check endpoints."""

from datetime import datetime
from typing import Any, Dict

import httpx
import structlog
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.core.config import settings
from src.core.redis import check_redis_connection
from src.db import check_db_connection

logger = structlog.get_logger()
router = APIRouter(tags=["health"])


async def check_ai_service() -> Dict[str, Any]:
    """Check AI service health."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            start = datetime.utcnow()
            response = await client.get(f"{settings.ai_service_url}/health")
            latency = (datetime.utcnow() - start).total_seconds() * 1000
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "latency_ms": round(latency, 2),
                }
            return {
                "status": "unhealthy",
                "error": f"Status code: {response.status_code}",
            }
    except httpx.ConnectError:
        return {"status": "unhealthy", "error": "Connection refused"}
    except httpx.TimeoutException:
        return {"status": "unhealthy", "error": "Timeout"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get(
    "/health",
    summary="Health check (liveness)",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> JSONResponse:
    """
    Liveness probe - checks if the service is running.
    Returns 200 if service is alive.
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": settings.app_name,
            "version": "0.1.0",
        }
    )


@router.get(
    "/ready",
    summary="Readiness check",
    status_code=status.HTTP_200_OK,
)
async def readiness_check() -> JSONResponse:
    """
    Readiness probe - checks if service is ready to accept requests.
    Verifies all dependencies (database, Redis, AI service).
    """
    # Check all dependencies
    db_healthy = await check_db_connection()
    redis_healthy = await check_redis_connection()
    ai_check = await check_ai_service()

    checks = {
        "database": {
            "status": "healthy" if db_healthy else "unhealthy",
        },
        "redis": {
            "status": "healthy" if redis_healthy else "unhealthy",
        },
        "ai_service": ai_check,
    }

    all_healthy = db_healthy and redis_healthy
    # AI service is not critical - can work without it

    overall_status = "ready" if all_healthy else "not_ready"
    http_status = (
        status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return JSONResponse(
        content={
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": checks,
        },
        status_code=http_status,
    )


@router.get(
    "/health/detailed",
    summary="Detailed health check",
    status_code=status.HTTP_200_OK,
)
async def detailed_health_check() -> JSONResponse:
    """
    Detailed health check with metrics for all dependencies.
    """
    # Import here to avoid circular imports
    from src.core.cache import cache

    # Check all dependencies
    db_healthy = await check_db_connection()
    redis_healthy = await check_redis_connection()
    ai_check = await check_ai_service()

    # Get cache stats
    cache_stats = cache.get_stats()

    checks = {
        "database": {
            "status": "healthy" if db_healthy else "unhealthy",
            "host": settings.database_host,
            "port": settings.database_port,
        },
        "redis": {
            "status": "healthy" if redis_healthy else "unhealthy",
            "host": settings.redis_host,
            "port": settings.redis_port,
        },
        "ai_service": {
            **ai_check,
            "url": settings.ai_service_url,
        },
        "cache": {
            "enabled": settings.cache_enabled,
            "stats": cache_stats,
        },
    }

    all_critical_healthy = db_healthy and redis_healthy

    return JSONResponse(
        content={
            "status": "healthy" if all_critical_healthy else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "service": settings.app_name,
            "environment": settings.environment,
            "version": "0.1.0",
            "checks": checks,
        },
        status_code=status.HTTP_200_OK if all_critical_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
    )