from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from api.health import router as health_router
from core.config import settings
from core.logging import configure_logging

logger = structlog.get_logger()

def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    """
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        environment=settings.environment,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    
    @app.get("/")
    async def root() -> dict:
        return {"message": "FastAPI backend is running"}

    logger.info("FastAPI application initialized")
    return app


app = create_app()
