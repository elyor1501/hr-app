import random
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.core.config import settings
from src.core.cache import cache
from src.core.redis import get_redis_pool
from src.db.session import get_db_session
from src.db.models import Candidate
from src.models.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
)
from src.repositories.candidate import CandidateRepository
from src.services import upload_file
from src.services.background_jobs import job_service

router = APIRouter()

CANDIDATES_CACHE_KEY = "hr_app:candidates:list"
CANDIDATES_CACHE_TTL = 60

ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

VALID_EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead"]
VALID_AVAILABILITY = ["Immediate", "2 weeks", "1 month", "3 months", "Not Available"]


def get_repository(session: AsyncSession = Depends(get_db_session)) -> CandidateRepository:
    return CandidateRepository(session)


async def invalidate_candidates_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:candidates:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


class PaginatedCandidatesResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


@router.post(
    "/",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new candidate",
)
async def create_candidate(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    current_title: Optional[str] = Form(None),
    current_company: Optional[str] = Form(None),
    years_of_experience: Optional[int] = Form(None),
    location: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    experience_level: Optional[str] = Form(None),
    hourly_rate: Optional[float] = Form(None),
    availability: Optional[str] = Form(None),
    status_field: str = Form("active", alias="status"),
    resume: Optional[UploadFile] = File(None),
    repo: CandidateRepository = Depends(get_repository),
):
    existing = await repo.get_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate with this email already exists"
        )

    if experience_level and experience_level not in VALID_EXPERIENCE_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"experience_level must be one of {VALID_EXPERIENCE_LEVELS}"
        )

    if availability and availability not in VALID_AVAILABILITY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"availability must be one of {VALID_AVAILABILITY}"
        )

    candidate_data = {
        "first_name": first_name.strip().title(),
        "last_name": last_name.strip().title(),
        "email": email,
        "phone": phone,
        "current_title": current_title,
        "current_company": current_company,
        "years_of_experience": years_of_experience,
        "location": location,
        "linkedin_url": linkedin_url,
        "status": status_field if status_field in ["active", "inactive"] else "active",
        "experience_level": experience_level,
        "hourly_rate": hourly_rate,
        "availability": availability,
    }

    if skills:
        candidate_data["skills"] = [s.strip().lower() for s in skills.split(",") if s.strip()]

    candidate_data["embedding"] = [random.uniform(-1, 1) for _ in range(3072)]

    resume_url = None
    if resume:
        if resume.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF and Word documents are allowed."
            )
        try:
            resume_url = await upload_file(resume)
            if resume_url:
                candidate_data["resume"] = resume_url
        except Exception as e:
            print(f"Resume upload failed: {e}")

    candidate = await repo.create(**candidate_data)

    if resume_url:
        try:
            await job_service.submit_process_resume(
                candidate_id=candidate.id,
                file_path=resume_url,
            )
        except Exception as e:
            print(f"Failed to submit resume processing job: {e}")

    await invalidate_candidates_cache()
    await cache.invalidate_search()

    return candidate


@router.get("/", response_model=PaginatedCandidatesResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"{CANDIDATES_CACHE_KEY}:{page}:{page_size}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedCandidatesResponse(**json.loads(cached))
    except Exception:
        pass

    total_result = await session.execute(select(func.count(Candidate.id)))
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await session.execute(
        select(Candidate)
        .order_by(Candidate.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    response_data = {
        "items": [item.to_dict() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, CANDIDATES_CACHE_TTL, json.dumps(response_data, default=str))
    except Exception:
        pass

    return PaginatedCandidatesResponse(**response_data)


@router.get("/search", response_model=PaginatedCandidatesResponse)
async def search_candidates(
    q: Optional[str] = Query(default=None, min_length=1),
    experience_level: Optional[str] = Query(default=None),
    availability: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    skills: Optional[str] = Query(default=None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    import hashlib
    skills_list = [s.strip().lower() for s in skills.split(",") if s.strip()] if skills else []
    cache_key = f"hr_backend:search:{hashlib.md5(f'{q}{experience_level}{availability}{location}{skills}{page}{page_size}'.encode()).hexdigest()}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedCandidatesResponse(**json.loads(cached))
    except Exception:
        pass

    filters = []

    if q:
        search_term = f"%{q}%"
        filters.append(
            or_(
                Candidate.first_name.ilike(search_term),
                Candidate.last_name.ilike(search_term),
                Candidate.current_title.ilike(search_term),
                Candidate.location.ilike(search_term),
                Candidate.email.ilike(search_term),
            )
        )

    if experience_level:
        filters.append(Candidate.experience_level == experience_level)

    if availability:
        filters.append(Candidate.availability == availability)

    if location:
        filters.append(Candidate.location.ilike(f"%{location}%"))

    if skills_list:
        for skill in skills_list:
            filters.append(
                func.lower(func.array_to_string(Candidate.skills, ' ')).contains(skill)
            )

    base_query = select(Candidate)
    count_query = select(func.count(Candidate.id))

    if filters:
        combined = and_(*filters)
        base_query = base_query.where(combined)
        count_query = count_query.where(combined)

    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await session.execute(
        base_query
        .order_by(Candidate.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    response = PaginatedCandidatesResponse(
        items=[item.to_dict() for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, 60, json.dumps(response.model_dump(), default=str))
    except Exception:
        pass

    return response


@router.get("/{id}", response_model=CandidateResponse)
async def get_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
    cache_key = f"hr_app:candidate:{id}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return CandidateResponse(**json.loads(cached))
    except Exception:
        pass

    candidate = await repo.get_by_id(id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate_dict = candidate.to_dict()

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, CANDIDATES_CACHE_TTL, json.dumps(candidate_dict, default=str))
    except Exception:
        pass

    return candidate


@router.patch("/{id}", response_model=CandidateResponse)
async def update_candidate(
    id: UUID,
    update_data: CandidateUpdate,
    repo: CandidateRepository = Depends(get_repository),
):
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Candidate not found")

    updated = await repo.update(id, **update_data.model_dump(exclude_unset=True))

    await invalidate_candidates_cache()
    await cache.invalidate_candidate(str(id))

    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")

    await invalidate_candidates_cache()
    await cache.invalidate_candidate(str(id))