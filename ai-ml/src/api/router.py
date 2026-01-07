from fastapi import APIRouter

from src.api.v1.health import router as health_router
from src.api.v1.inference import router as inference_router


api_router = APIRouter()

api_router.include_router(
    health_router,
    prefix="/v1",
    tags=["health"],
)

api_router.include_router(
    inference_router,
    prefix="/v1",
    tags=["inference"],
)
