from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.db.session import get_db_session
from src.db.models import Job, Candidate, Resume, ParsedResume

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


class StatsResponse(BaseModel):
    total_jobs: int = 0
    total_employees: int = 0
    total_resumes: int = 0
    jobs_by_type: JobsByType
    jobs_by_status: JobsByStatus
    candidates_by_status: CandidatesByStatus


@router.get("", response_model=StatsResponse)
async def get_stats(session: AsyncSession = Depends(get_db_session)):
    
    total_jobs_result = await session.execute(select(func.count(Job.id)))
    total_jobs = total_jobs_result.scalar() or 0

    total_employees_result = await session.execute(select(func.count(ParsedResume.id)))
    total_employees = total_employees_result.scalar() or 0

    total_resumes_result = await session.execute(select(func.count(Resume.id)))
    total_resumes = total_resumes_result.scalar() or 0

    full_time_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.employment_type) == "full time")
    )
    part_time_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.employment_type) == "part time")
    )
    contract_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.employment_type) == "contract")
    )
    internship_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.employment_type) == "internship")
    )
    entry_level_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.employment_type) == "entry level")
    )

    open_jobs_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.status) == "open")
    )
    closed_jobs_result = await session.execute(
        select(func.count(Job.id)).where(func.lower(Job.status) == "closed")
    )

    active_candidates_result = await session.execute(
        select(func.count(ParsedResume.id)).where(ParsedResume.candidate_status == "active")
    )
    inactive_candidates_result = await session.execute(
        select(func.count(ParsedResume.id)).where(ParsedResume.candidate_status == "inactive")
    )

    return StatsResponse(
        total_jobs=total_jobs,
        total_employees=total_employees,
        total_resumes=total_resumes,
        jobs_by_type=JobsByType(
            full_time=full_time_result.scalar() or 0,
            part_time=part_time_result.scalar() or 0,
            contract=contract_result.scalar() or 0,
            internship=internship_result.scalar() or 0,
            entry_level=entry_level_result.scalar() or 0
        ),
        jobs_by_status=JobsByStatus(
            open_jobs=open_jobs_result.scalar() or 0,
            closed_jobs=closed_jobs_result.scalar() or 0
        ),
        candidates_by_status=CandidatesByStatus(
            active=active_candidates_result.scalar() or 0,
            inactive=inactive_candidates_result.scalar() or 0
        )
    )