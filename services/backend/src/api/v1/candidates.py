import asyncio
import random
import json
import hashlib
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

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
CANDIDATES_CACHE_TTL = 300
SEARCH_CACHE_TTL = 120

ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

VALID_EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead"]
VALID_AVAILABILITY = ["Immediate", "2 weeks", "1 month", "3 months", "Not Available"]

CANDIDATE_LIST_COLUMNS = [
    Candidate.id,
    Candidate.first_name,
    Candidate.last_name,
    Candidate.email,
    Candidate.phone,
    Candidate.current_title,
    Candidate.current_company,
    Candidate.years_of_experience,
    Candidate.skills,
    Candidate.location,
    Candidate.status,
    Candidate.linkedin_url,
    Candidate.experience_level,
    Candidate.hourly_rate,
    Candidate.availability,
    Candidate.resume,
    Candidate.json_data,
    Candidate.created_at,
    Candidate.updated_at,
    Candidate.daily_rate,
    Candidate.rate_type,
    Candidate.currency,
    Candidate.vendor,
    Candidate.proposed_rate,
    Candidate.proposed_rate_type,
    Candidate.proposed_daily_rate,
    Candidate.proposed_currency,
]


def get_repository(session: AsyncSession = Depends(get_db_session)) -> CandidateRepository:
    return CandidateRepository(session)


async def invalidate_candidates_cache():
    try:
        redis = await get_redis_pool()
        cursor = 0
        keys_to_delete = []
        while True:
            cursor, keys = await redis.scan(cursor, match="hr_app:candidates:*", count=100)
            keys_to_delete.extend(keys)
            if cursor == 0:
                break
        if keys_to_delete:
            await redis.delete(*keys_to_delete)
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
    q: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"{CANDIDATES_CACHE_KEY}:{page}:{page_size}:{q or ''}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedCandidatesResponse(**json.loads(cached))
    except Exception:
        pass

    filters = []
    if q:
        filters.append(
            or_(
                Candidate.first_name.ilike(f"%{q}%"),
                Candidate.last_name.ilike(f"%{q}%"),
                Candidate.current_title.ilike(f"%{q}%"),
                Candidate.location.ilike(f"%{q}%"),
                Candidate.email.ilike(f"%{q}%"),
            )
        )

    base_query = select(*CANDIDATE_LIST_COLUMNS).order_by(Candidate.created_at.desc())
    count_stmt = select(func.count()).select_from(base_query.subquery())

    if filters:
        filtered_query = base_query.where(and_(*filters))
        count_stmt = select(func.count()).select_from(filtered_query.subquery())
    else:
        filtered_query = base_query

    total_result = await session.execute(count_stmt)
    result = await session.execute(filtered_query.offset((page - 1) * page_size).limit(page_size))

    total = total_result.scalar() or 0
    rows = result.mappings().all()
    items = [dict(row) for row in rows]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    response_data = {
        "items": items,
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
    q: Optional[str] = Query(default=None),
    name: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    currentTitle: Optional[str] = Query(default=None),
    job_title: Optional[str] = Query(default=None),
    currentCompany: Optional[str] = Query(default=None),
    experienceMin: Optional[int] = Query(default=None, ge=0),
    experienceMax: Optional[int] = Query(default=None, ge=0),
    skills: Optional[str] = Query(default=None),
    candidateStatus: Optional[str] = Query(default=None),
    experience_level: Optional[str] = Query(default=None),
    availability: Optional[str] = Query(default=None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    resolved_title = currentTitle or job_title

    cache_key = f"hr_backend:search:{hashlib.md5(f'{q}{name}{location}{resolved_title}{currentCompany}{experienceMin}{experienceMax}{skills}{candidateStatus}{experience_level}{availability}{page}{page_size}'.encode()).hexdigest()}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedCandidatesResponse(**json.loads(cached))
    except Exception:
        pass

    filters = []

    if q:
        filters.append(
            or_(
                Candidate.first_name.ilike(f"%{q}%"),
                Candidate.last_name.ilike(f"%{q}%"),
                Candidate.current_title.ilike(f"%{q}%"),
                Candidate.location.ilike(f"%{q}%"),
                Candidate.email.ilike(f"%{q}%"),
            )
        )

    if name:
        filters.append(
            or_(
                Candidate.first_name.ilike(f"%{name}%"),
                Candidate.last_name.ilike(f"%{name}%"),
                func.concat(Candidate.first_name, ' ', Candidate.last_name).ilike(f"%{name}%"),
            )
        )

    if location:
        filters.append(Candidate.location.ilike(f"%{location}%"))

    if resolved_title:
        filters.append(Candidate.current_title.ilike(f"%{resolved_title}%"))

    if currentCompany:
        filters.append(Candidate.current_company.ilike(f"%{currentCompany}%"))

    if experienceMin is not None:
        filters.append(Candidate.years_of_experience >= experienceMin)

    if experienceMax is not None:
        filters.append(Candidate.years_of_experience <= experienceMax)

    if skills:
        skills_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
        if skills_list:
            skills_filters = [
                func.lower(func.array_to_string(Candidate.skills, ' ')).contains(skill)
                for skill in skills_list
            ]
            filters.append(or_(*skills_filters))

    if candidateStatus:
        filters.append(Candidate.status == candidateStatus)

    if experience_level:
        filters.append(Candidate.experience_level == experience_level)

    if availability:
        filters.append(Candidate.availability == availability)

    base_query = select(*CANDIDATE_LIST_COLUMNS).order_by(Candidate.created_at.desc())

    if filters:
        combined = and_(*filters)
        filtered_query = base_query.where(combined)
        count_query = select(func.count()).select_from(filtered_query.subquery())
    else:
        filtered_query = base_query
        count_query = select(func.count()).select_from(filtered_query.subquery())

    total_result = await session.execute(count_query)
    result = await session.execute(filtered_query.offset((page - 1) * page_size).limit(page_size))

    total = total_result.scalar() or 0
    rows = result.mappings().all()
    items = [dict(row) for row in rows]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    response = PaginatedCandidatesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, SEARCH_CACHE_TTL, json.dumps(response.model_dump(), default=str))
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

    update_dict = update_data.model_dump(exclude_unset=True)

    if "hourly_rate" in update_dict or "rate_type" in update_dict:
        rate = update_dict.get("hourly_rate")
        if rate is None:
            existing = await repo.get_by_id(id)
            rate = existing.hourly_rate if existing else None
        rate_type = update_dict.get("rate_type", "hourly")
        if rate is not None:
            if rate_type == "hourly":
                update_dict["daily_rate"] = round(float(rate) * 8, 2)
            elif rate_type == "daily":
                update_dict["daily_rate"] = round(float(rate), 2)
            elif rate_type == "weekly":
                update_dict["daily_rate"] = round(float(rate) / 5, 2)
            elif rate_type == "monthly":
                update_dict["daily_rate"] = round(float(rate) / 22, 2)

    if "proposed_rate" in update_dict or "proposed_rate_type" in update_dict:
        p_rate = update_dict.get("proposed_rate")
        if p_rate is None:
            existing = await repo.get_by_id(id)
            p_rate = existing.proposed_rate if existing else None
        p_rate_type = update_dict.get("proposed_rate_type", "daily")
        if p_rate is not None:
            if p_rate_type == "hourly":
                update_dict["proposed_daily_rate"] = round(float(p_rate) * 8, 2)
            elif p_rate_type == "daily":
                update_dict["proposed_daily_rate"] = round(float(p_rate), 2)
            elif p_rate_type == "weekly":
                update_dict["proposed_daily_rate"] = round(float(p_rate) / 5, 2)
            elif p_rate_type == "monthly":
                update_dict["proposed_daily_rate"] = round(float(p_rate) / 22, 2)

    if "status" in update_dict:
        if update_dict["status"] not in ["active", "inactive"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be active or inactive"
            )

    updated = await repo.update(id, **update_dict)

    await invalidate_candidates_cache()

    try:
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate:{id}")
        cursor = 0
        keys_to_delete = []
        while True:
            cursor, keys = await redis.scan(cursor, match="hr_backend:search:*", count=100)
            keys_to_delete.extend(keys)
            if cursor == 0:
                break
        if keys_to_delete:
            await redis.delete(*keys_to_delete)
    except Exception:
        pass

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