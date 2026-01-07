from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Health check",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> JSONResponse:
    """
    Liveness probe.
    """
    return JSONResponse(content={"status": "healthy"})


@router.get(
    "/ready",
    summary="Readiness check",
    status_code=status.HTTP_200_OK,
)
async def readiness_check() -> JSONResponse:
    """
    Readiness probe.
    """
    return JSONResponse(content={"status": "ready"})
