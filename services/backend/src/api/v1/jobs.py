import json
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from src.core.cache import cache
from src.core.redis import get_redis_pool
from src.db.session import get_db_session
from src.models.job import JobCreate, JobResponse, JobUpdate
from src.repositories.base import BaseRepository
from src.db.models import Job

router = APIRouter()

JOBS_CACHE_KEY = "hr_app:jobs:list"
JOBS_CACHE_TTL = 60


def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Job]:
    return BaseRepository(Job, session)


async def invalidate_jobs_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:jobs:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass
    try:
        await cache.delete_pattern("job:*")
    except Exception:
        pass


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
    await invalidate_jobs_cache()
    return job


@router.get("/", response_model=PaginatedJobsResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"{JOBS_CACHE_KEY}:{page}:{page_size}"
    
    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedJobsResponse(**json.loads(cached))
    except Exception:
        pass

    count_query = text("SELECT COUNT(*) FROM jobs")
    count_result = await session.execute(count_query)
    total = count_result.scalar() or 0
    
    offset = (page - 1) * page_size
    
    query = text("""
        SELECT id, title, department, employment_type, work_mode, location,
               description, responsibilities, required_skills, preferred_skills,
               experience_required, education, salary_range, openings, hiring_manager,
               application_posted, application_deadline, status, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
        OFFSET :offset LIMIT :limit
    """)
    
    result = await session.execute(query, {"offset": offset, "limit": page_size})
    rows = result.fetchall()
    
    items = []
    for row in rows:
        items.append({
            "id": str(row.id),
            "title": row.title,
            "department": row.department,
            "employment_type": row.employment_type,
            "work_mode": row.work_mode,
            "location": row.location,
            "description": row.description,
            "responsibilities": row.responsibilities,
            "required_skills": row.required_skills,
            "preferred_skills": row.preferred_skills,
            "experience_required": row.experience_required,
            "education": row.education,
            "salary_range": row.salary_range,
            "openings": row.openings,
            "hiring_manager": row.hiring_manager,
            "application_posted": str(row.application_posted) if row.application_posted else None,
            "application_deadline": str(row.application_deadline) if row.application_deadline else None,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        })
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    response_data = {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, JOBS_CACHE_TTL, json.dumps(response_data))
    except Exception:
        pass

    return PaginatedJobsResponse(**response_data)


@router.get("/{id}", response_model=JobResponse)
async def get_job(id: UUID, repo: BaseRepository[Job] = Depends(get_repository)):
    cache_key = f"hr_app:job:{id}"
    
    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return JobResponse(**json.loads(cached))
    except Exception:
        pass
    
    job = await repo.get_by_id(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_dict = job.to_dict()
    
    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, JOBS_CACHE_TTL, json.dumps(job_dict))
    except Exception:
        pass
    
    return job


@router.patch("/{id}", response_model=JobResponse)
async def update_job(id: UUID, update_data: JobUpdate, repo: BaseRepository[Job] = Depends(get_repository)):
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Job not found")
    db_data = update_data.to_db_dict()
    if not db_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    updated = await repo.update(id, **db_data)
    await invalidate_jobs_cache()
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(id: UUID, repo: BaseRepository[Job] = Depends(get_repository)):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    await invalidate_jobs_cache()