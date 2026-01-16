# D:\hr-app\services\backend\src\main.py

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.health import router as health_router
from src.core.config import settings
from src.core.logging import configure_logging
from src.db import close_db_connection, init_db_connection

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifespan events.
    Handles startup and shutdown of database connections.
    """
    # Startup
    logger.info("Starting up application...")
    try:
        await init_db_connection()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    try:
        await close_db_connection()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))
        raise


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    """
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
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

    logger.info("FastAPI application created", environment=settings.environment)
    return app


app = create_app()