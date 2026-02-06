from typing import List, Optional 
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db_session
from src.models.job import JobCreate, JobResponse, JobUpdate
from src.models.enums import JobStatus
from src.repositories.job import JobRepository
from typing import List, Optional
from src.models.enums import JobStatus
from src.api.deps import get_current_user
router = APIRouter()


def get_repository(session: AsyncSession = Depends(get_db_session)) -> JobRepository:
    return JobRepository(session)


@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting",
)
async def create_job(
    job_in: JobCreate,
    repo: JobRepository = Depends(get_repository),
):
    return await repo.create(**job_in.model_dump())


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search in title or description"),
    status: Optional[JobStatus] = Query(None, description="Filter by job status"),
    repo: JobRepository = Depends(get_repository),
    current_user = Depends(get_current_user)
):
    """List jobs with pagination, full-text search, and status filtering."""
    return await repo.get_all(skip=skip, limit=limit, search=search, status=status)


@router.get("/{id}", response_model=JobResponse)
async def get_job(
    id: UUID,
    repo: JobRepository = Depends(get_repository),
):
    job = await repo.get_by_id(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{id}", response_model=JobResponse)
async def update_job(
    id: UUID,
    update_data: JobUpdate,
    repo: JobRepository = Depends(get_repository),
):
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Job not found")
    
    updated = await repo.update(id, **update_data.model_dump(exclude_unset=True))
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    id: UUID,
    repo: JobRepository = Depends(get_repository),
):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")