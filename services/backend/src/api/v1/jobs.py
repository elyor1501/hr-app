from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from src.core.cache import cache
from src.db.session import get_db_session
from src.models.job import JobCreate, JobResponse, JobUpdate
from src.repositories.base import BaseRepository
from src.db.models import Job

router = APIRouter()


def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Job]:
    return BaseRepository(Job, session)


class PaginatedJobsResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, summary="Create a new job posting")
async def create_job(job_in: JobCreate, repo: BaseRepository[Job] = Depends(get_repository)):
    job_data = job_in.to_db_dict()
    job_data["embedding"] = None
    job = await repo.create(**job_data)
    await cache.delete_pattern("job:*")
    return job


@router.get("/", response_model=PaginatedJobsResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    session: AsyncSession = Depends(get_db_session),
):
    count_result = await session.execute(select(func.count(Job.id)))
    total = count_result.scalar()
    
    offset = (page - 1) * page_size
    query = (
        select(Job)
        .order_by(Job.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedJobsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )


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