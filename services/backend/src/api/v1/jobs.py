from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import cache
from src.db.session import get_db_session
from src.models.job import JobCreate, JobResponse, JobUpdate
from src.repositories.base import BaseRepository
from src.db.models import Job

router = APIRouter()


def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Job]:
    return BaseRepository(Job, session)


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, summary="Create a new job posting")
async def create_job(job_in: JobCreate, repo: BaseRepository[Job] = Depends(get_repository)):
    job_data = job_in.to_db_dict()
    job_data["embedding"] = None
    job = await repo.create(**job_data)
    await cache.delete_pattern("job:*")
    return job


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    query = (
        select(Job)
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{id}", response_model=JobResponse)
async def get_job(id: UUID, repo: BaseRepository[Job] = Depends(get_repository)):
    cached = await cache.get_job(str(id))
    if cached:
        return JobResponse(**cached)
    job = await repo.get_by_id(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await cache.set_job(str(id), job.to_dict())
    return job


@router.patch("/{id}", response_model=JobResponse)
async def update_job(id: UUID, update_data: JobUpdate, repo: BaseRepository[Job] = Depends(get_repository)):
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Job not found")
    db_data = update_data.to_db_dict()
    if not db_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    updated = await repo.update(id, **db_data)
    await cache.invalidate_job(str(id))
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(id: UUID, repo: BaseRepository[Job] = Depends(get_repository)):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    await cache.invalidate_job(str(id))