from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.db import check_db_connection

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Health check",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> JSONResponse:
    """
    Liveness probe - checks if the service is running.
    """
    return JSONResponse(content={"status": "healthy"})


@router.get(
    "/ready",
    summary="Readiness check",
    status_code=status.HTTP_200_OK,
)
async def readiness_check() -> JSONResponse:
    """
    Readiness probe - checks if the service is ready to accept requests.
    Includes database connectivity check.
    """
    db_healthy = await check_db_connection()

    checks = {
        "database": "healthy" if db_healthy else "unhealthy",
    }

    all_healthy = all(s == "healthy" for s in checks.values())

    overall_status = "ready" if all_healthy else "not_ready"
    http_status = (
        status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return JSONResponse(
        content={
            "status": overall_status,
            "checks": checks,
        },
        status_code=http_status,
    )