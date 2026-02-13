import random
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.session import get_db_session
from src.models.job import JobCreate, JobResponse, JobUpdate
from src.repositories.base import BaseRepository
from src.db.models import Job

router = APIRouter()


def get_repository(
    session: AsyncSession = Depends(get_db_session),
) -> BaseRepository[Job]:
    return BaseRepository(Job, session)


@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting",
)
async def create_job(
    job_in: JobCreate,
    repo: BaseRepository[Job] = Depends(get_repository),
):
    job_data = job_in.model_dump()
    
    # Generate dummy embedding for now
    job_data["embedding"] = [
        random.uniform(-1, 1) for _ in range(settings.vector_dimension)
    ]
    
    return await repo.create(**job_data)


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    repo: BaseRepository[Job] = Depends(get_repository),
):
    """List jobs with pagination."""
    # Using generic get_all which returns a list directly
    return await repo.get_all(skip=skip, limit=limit)


@router.get("/{id}", response_model=JobResponse)
async def get_job(
    id: UUID,
    repo: BaseRepository[Job] = Depends(get_repository),
):
    job = await repo.get_by_id(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{id}", response_model=JobResponse)
async def update_job(
    id: UUID,
    update_data: JobUpdate,
    repo: BaseRepository[Job] = Depends(get_repository),
):
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Job not found")

    updated = await repo.update(
        id, **update_data.model_dump(exclude_unset=True)
    )
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    id: UUID,
    repo: BaseRepository[Job] = Depends(get_repository),
):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")