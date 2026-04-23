import json
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.db.session import get_db_session
from src.core.redis import get_redis_pool

router = APIRouter()


class JobsByType(BaseModel):
    full_time: int = 0
    part_time: int = 0
    contract: int = 0
    internship: int = 0
    entry_level: int = 0


class JobsByStatus(BaseModel):
    open_jobs: int = 0
    closed_jobs: int = 0


class CandidatesByStatus(BaseModel):
    active: int = 0
    inactive: int = 0


class RequestStats(BaseModel):
    open_requests: int = 0
    in_progress_requests: int = 0
    signed_requests: int = 0
    closed_requests: int = 0
    total_active_requests: int = 0


class StatsResponse(BaseModel):
    total_jobs: int = 0
    total_employees: int = 0
    total_resumes: int = 0
    jobs_by_type: JobsByType
    jobs_by_status: JobsByStatus
    candidates_by_status: CandidatesByStatus
    requests: RequestStats


STATS_CACHE_KEY = "hr_app:stats:dashboard"
STATS_CACHE_TTL = 60


@router.get("", response_model=StatsResponse)
async def get_stats(session: AsyncSession = Depends(get_db_session)):
    try:
        redis = await get_redis_pool()
        cached = await redis.get(STATS_CACHE_KEY)
        if cached:
            return StatsResponse(**json.loads(cached))
    except Exception:
        pass

    query = text("""
        SELECT 
            (SELECT COUNT(*) FROM jobs) as total_jobs,
            (SELECT COUNT(*) FROM candidates) as total_employees,
            (SELECT COUNT(*) FROM resumes) as total_resumes,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(employment_type) = 'full time') as full_time,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(employment_type) = 'part time') as part_time,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(employment_type) = 'contract') as contract,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(employment_type) = 'internship') as internship,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(employment_type) = 'entry level') as entry_level,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(status) = 'open') as open_jobs,
            (SELECT COUNT(*) FROM jobs WHERE LOWER(status) = 'closed') as closed_jobs,
            (SELECT COUNT(*) FROM parsed_resumes WHERE candidate_status = 'active') as active_candidates,
            (SELECT COUNT(*) FROM parsed_resumes WHERE candidate_status = 'inactive') as inactive_candidates,
            (SELECT COUNT(*) FROM staffing_requests WHERE state = 'open') as open_requests,
            (SELECT COUNT(*) FROM staffing_requests WHERE state = 'in_progress') as in_progress_requests,
            (SELECT COUNT(*) FROM staffing_requests WHERE state = 'signed') as signed_requests,
            (SELECT COUNT(*) FROM staffing_requests WHERE state = 'closed') as closed_requests
    """)

    result = await session.execute(query)
    row = result.fetchone()

    open_requests = row.open_requests or 0
    in_progress_requests = row.in_progress_requests or 0

    response = StatsResponse(
        total_jobs=row.total_jobs or 0,
        total_employees=row.total_employees or 0,
        total_resumes=row.total_resumes or 0,
        jobs_by_type=JobsByType(
            full_time=row.full_time or 0,
            part_time=row.part_time or 0,
            contract=row.contract or 0,
            internship=row.internship or 0,
            entry_level=row.entry_level or 0
        ),
        jobs_by_status=JobsByStatus(
            open_jobs=row.open_jobs or 0,
            closed_jobs=row.closed_jobs or 0
        ),
        candidates_by_status=CandidatesByStatus(
            active=row.active_candidates or 0,
            inactive=row.inactive_candidates or 0
        ),
        requests=RequestStats(
            open_requests=open_requests,
            in_progress_requests=in_progress_requests,
            signed_requests=row.signed_requests or 0,
            closed_requests=row.closed_requests or 0,
            total_active_requests=open_requests + in_progress_requests
        )
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(STATS_CACHE_KEY, STATS_CACHE_TTL, json.dumps(response.model_dump()))
    except Exception:
        pass

    return response