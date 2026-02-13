# D:\hr-app\services\backend\src\main.py

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Routers
from src.api.health import router as health_router
from src.api.v1.candidates import router as candidates_router
from src.api.v1.jobs import router as jobs_router
from src.api.v1.search import router as search_router
from src.api.v1.matching import router as matching_router
from src.api.v1.auth import router as auth_router # NEW

# Config & Core
from src.core.config import settings
from src.core.logging import configure_logging

# Database
from src.db import close_db_connection, init_db_connection
from src.db.base import Base
from src.db.session import engine

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application lifespan events."""
    logger.info("Starting up application...")
    try:
        await init_db_connection()
        if settings.environment == "development":
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified (Dev mode)")
        logger.info("Application startup complete")
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        raise

    yield

    logger.info("Shutting down application...")
    try:
        await close_db_connection()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))
        raise


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
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

    # Register Routers
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(candidates_router, prefix="/api/v1/candidates", tags=["candidates"])
    app.include_router(jobs_router, prefix="/api/v1/jobs", tags=["jobs"])
    app.include_router(search_router, prefix="/api/v1/search", tags=["search"])
    app.include_router(matching_router, prefix="/api/v1/match", tags=["matching"])

    @app.get("/")
    async def root() -> dict:
        return {"message": "FastAPI backend is running"}

    logger.info("FastAPI application created", environment=settings.environment)
    return app


app = create_app()