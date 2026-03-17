# src/services/background_jobs.py
"""
Background job submission helpers.
"""

import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import structlog
from arq import create_pool
from arq.connections import RedisSettings

from src.core.config import settings
from src.core.redis import get_redis_pool

logger = structlog.get_logger()


class JobStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD = "dead"


class JobType(str, Enum):
    PROCESS_RESUME = "process_resume"
    GENERATE_EMBEDDINGS = "generate_embeddings"
    BULK_MATCH = "bulk_match"


class JobInfo:
    def __init__(
        self,
        job_id: str,
        job_type: JobType,
        status: JobStatus = JobStatus.PENDING,
        progress: int = 0,
        result: Optional[Dict] = None,
        error: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        attempts: int = 0,
    ):
        self.job_id = job_id
        self.job_type = job_type
        self.status = status
        self.progress = progress
        self.result = result
        self.error = error
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.attempts = attempts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type.value,
            "status": self.status.value,
            "progress": self.progress,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "attempts": self.attempts,
        }


class JobService:
    JOB_KEY_PREFIX = f"{settings.cache_prefix}:jobs"
    DLQ_KEY = f"{settings.cache_prefix}:dlq"

    def __init__(self):
        self._pool = None

    async def _get_pool(self):
        if self._pool is None:
            self._pool = await create_pool(
                RedisSettings(
                    host=settings.redis_host,
                    port=settings.redis_port,
                )
            )
        return self._pool

    async def _save_job_info(self, job_info: JobInfo) -> None:
        redis = await get_redis_pool()
        key = f"{self.JOB_KEY_PREFIX}:{job_info.job_id}"
        await redis.setex(
            key,
            settings.job_result_ttl,
            json.dumps(job_info.to_dict()),
        )

    async def get_job_status(self, job_id: str) -> Optional[JobInfo]:
        redis = await get_redis_pool()
        key = f"{self.JOB_KEY_PREFIX}:{job_id}"
        data = await redis.get(key)
        
        if not data:
            return None
        
        info = json.loads(data)
        return JobInfo(
            job_id=info["job_id"],
            job_type=JobType(info["job_type"]),
            status=JobStatus(info["status"]),
            progress=info["progress"],
            result=info.get("result"),
            error=info.get("error"),
            created_at=datetime.fromisoformat(info["created_at"]),
            updated_at=datetime.fromisoformat(info["updated_at"]),
            attempts=info.get("attempts", 0),
        )

    async def update_job_progress(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = 0,
        result: Optional[Dict] = None,
        error: Optional[str] = None,
    ) -> None:
        job_info = await self.get_job_status(job_id)
        if job_info:
            job_info.status = status
            job_info.progress = progress
            job_info.result = result
            job_info.error = error
            job_info.updated_at = datetime.utcnow()
            await self._save_job_info(job_info)

    async def move_to_dlq(self, job_id: str, error: str) -> None:
        redis = await get_redis_pool()
        job_info = await self.get_job_status(job_id)
        if job_info:
            job_info.status = JobStatus.DEAD
            job_info.error = error
            job_info.updated_at = datetime.utcnow()
            await redis.lpush(self.DLQ_KEY, json.dumps(job_info.to_dict()))
            logger.warning("job_moved_to_dlq", job_id=job_id, error=error)

    async def get_dlq_jobs(self, limit: int = 100) -> list:
        redis = await get_redis_pool()
        items = await redis.lrange(self.DLQ_KEY, 0, limit - 1)
        return [json.loads(item) for item in items]

    async def submit_process_resume(self, candidate_id: UUID, file_path: str) -> str:
        job_id = str(uuid4())
        job_info = JobInfo(job_id=job_id, job_type=JobType.PROCESS_RESUME)
        await self._save_job_info(job_info)

        pool = await self._get_pool()
        await pool.enqueue_job("process_resume", job_id, str(candidate_id), file_path)
        logger.info("job_submitted", job_id=job_id, job_type=JobType.PROCESS_RESUME.value)
        return job_id

    async def submit_generate_embeddings(self, record_type: str, record_id: UUID, text: str) -> str:
        job_id = str(uuid4())
        job_info = JobInfo(job_id=job_id, job_type=JobType.GENERATE_EMBEDDINGS)
        await self._save_job_info(job_info)

        pool = await self._get_pool()
        await pool.enqueue_job("generate_embeddings", job_id, record_type, str(record_id), text)
        logger.info("job_submitted", job_id=job_id, job_type=JobType.GENERATE_EMBEDDINGS.value)
        return job_id

    async def submit_bulk_match(self, job_id: UUID, candidate_ids: Optional[List[UUID]] = None) -> str:
        task_id = str(uuid4())
        job_info = JobInfo(job_id=task_id, job_type=JobType.BULK_MATCH)
        await self._save_job_info(job_info)

        pool = await self._get_pool()
        await pool.enqueue_job(
            "bulk_match_candidates",
            task_id,
            str(job_id),
            [str(c) for c in candidate_ids] if candidate_ids else None,
        )
        logger.info("job_submitted", job_id=task_id, job_type=JobType.BULK_MATCH.value)
        return task_id


job_service = JobService()


def get_job_service() -> JobService:
    return job_service