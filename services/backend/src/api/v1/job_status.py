# src/api/v1/job_status.py
"""
Job status endpoints for background tasks.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.services.background_jobs import JobService, get_job_service

router = APIRouter()


class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: int
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str
    attempts: int


class DLQJobResponse(BaseModel):
    job_id: str
    job_type: str
    error: str
    created_at: str


@router.get(
    "/{job_id}/status",
    response_model=JobStatusResponse,
    summary="Get job status",
)
async def get_job_status(
    job_id: str,
    job_service: JobService = Depends(get_job_service),
):
    """Get the status of a background job."""
    job_info = await job_service.get_job_status(job_id)
    
    if not job_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )
    
    return JobStatusResponse(
        job_id=job_info.job_id,
        job_type=job_info.job_type.value,
        status=job_info.status.value,
        progress=job_info.progress,
        result=job_info.result,
        error=job_info.error,
        created_at=job_info.created_at.isoformat(),
        updated_at=job_info.updated_at.isoformat(),
        attempts=job_info.attempts,
    )


@router.get(
    "/dlq",
    response_model=List[DLQJobResponse],
    summary="Get dead letter queue jobs",
)
async def get_dlq_jobs(
    limit: int = 100,
    job_service: JobService = Depends(get_job_service),
):
    """Get jobs that have permanently failed."""
    jobs = await job_service.get_dlq_jobs(limit=limit)
    return [
        DLQJobResponse(
            job_id=job["job_id"],
            job_type=job["job_type"],
            error=job.get("error", "Unknown error"),
            created_at=job["created_at"],
        )
        for job in jobs
    ]