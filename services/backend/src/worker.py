import os
from arq.connections import RedisSettings
import structlog

logger = structlog.get_logger()


async def startup(ctx):
    """Called when the worker starts."""
    logger.info("ARQ Worker started")


async def shutdown(ctx):
    """Called when the worker shuts down."""
    logger.info("ARQ Worker shutting down")


async def process_resume(ctx, candidate_id: str, file_path: str):
    """Background task: Process uploaded resume."""
    logger.info("Processing resume", candidate_id=candidate_id, file_path=file_path)
    return {"status": "processed", "candidate_id": candidate_id}


async def generate_embeddings(ctx, text: str, record_id: str):
    """Background task: Generate vector embeddings."""
    logger.info("Generating embeddings", record_id=record_id)
    return {"status": "completed", "record_id": record_id}


async def match_candidates(ctx, job_id: str):
    """Background task: Match candidates to a job."""
    logger.info("Matching candidates", job_id=job_id)
    return {"status": "matched", "job_id": job_id}


class WorkerSettings:
    """ARQ Worker Settings."""

    functions = [
        process_resume,
        generate_embeddings,
        match_candidates,
    ]

    on_startup = startup
    on_shutdown = shutdown

    redis_settings = RedisSettings(
        host=os.getenv("HR_APP_REDIS_HOST", "redis"),
        port=int(os.getenv("HR_APP_REDIS_PORT", "6379")),
    )

    max_jobs = 10
    job_timeout = 300
    keep_result = 3600