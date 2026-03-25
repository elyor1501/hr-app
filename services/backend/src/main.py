from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.health import router as health_router
from src.api.metrics import router as metrics_router
from src.api.v1.candidates import router as candidates_router
from src.api.v1.jobs import router as jobs_router
from src.api.v1.search import router as search_router
from src.api.v1.matching import router as matching_router
from src.api.v1.auth import router as auth_router
from src.api.v1.resumes import router as resumes_router
from src.api.v1.tasks import router as tasks_router
# ⬇️ ADD THIS NEW IMPORT ⬇️
from src.api.v1.parsed_resumes import router as parsed_resumes_router

from src.core.config import settings
from src.core.logging import configure_logging
from src.core.redis import close_redis_pool, get_redis_pool
from src.db import close_db_connection, init_db_connection
from src.db.base import Base
from src.db.session import engine
from src.services.task_queue import get_task_queue, close_task_queue

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db_connection()
    await get_redis_pool()
    await get_task_queue()
    if settings.environment == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await close_db_connection()
    await close_redis_pool()
    await close_task_queue()

def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    app.include_router(health_router)
    app.include_router(metrics_router)
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(candidates_router, prefix="/api/v1/candidates", tags=["candidates"])
    app.include_router(jobs_router, prefix="/api/v1/jobs", tags=["jobs"])
    app.include_router(search_router, prefix="/api/v1/search", tags=["search"])
    app.include_router(matching_router, prefix="/api/v1/match", tags=["matching"])
    app.include_router(resumes_router, prefix="/api/v1/resumes", tags=["resumes"])
    app.include_router(tasks_router, prefix="/api/v1/tasks", tags=["tasks"])
    # ⬇️ ADD THIS NEW ROUTER ⬇️
    app.include_router(parsed_resumes_router, prefix="/api/v1/parsed-resumes", tags=["parsed-resumes"])
    return app

app = create_app()