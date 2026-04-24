from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
import json
import asyncio

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db_session, async_session_maker
from src.db.models import StaffingRequest, RequestCandidate, RequestAuditLog, Candidate, ParsedResume
from src.core.redis import get_redis_pool
from src.services.ai_client import AIClient

logger = structlog.get_logger()
router = APIRouter()
ai_client = AIClient()

VALID_TRANSITIONS = {
    "open": ["in_progress"],
    "in_progress": ["signed", "closed"],
    "signed": [],
    "closed": [],
}


class RequestCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    request_title: str = Field(..., min_length=1, max_length=255)
    job_description: str = Field(..., min_length=1)
    prepared_rate: Optional[float] = Field(default=None, ge=0)
    request_date: date = Field(...)
    proposed_date: Optional[date] = Field(default=None)


class RequestUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=255)
    request_title: Optional[str] = Field(default=None, max_length=255)
    job_description: Optional[str] = Field(default=None)
    prepared_rate: Optional[float] = Field(default=None, ge=0)
    final_rate: Optional[float] = Field(default=None, ge=0)
    proposed_date: Optional[date] = Field(default=None)
    customer_feedback: Optional[str] = Field(default=None)
    contract_status: Optional[bool] = Field(default=None)


class StateTransition(BaseModel):
    new_state: str = Field(...)
    notes: Optional[str] = Field(default=None)


class ProposeCandidateRequest(BaseModel):
    candidate_id: UUID = Field(...)
    proposed_rate: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = Field(default=None)


class AutoMatchRequest(BaseModel):
    top_k: int = Field(default=10, ge=1, le=10)
    min_score: int = Field(default=0, ge=0, le=100)
    auto_propose: bool = Field(default=False)


class SkillsComparison(BaseModel):
    job_required_skills: List[str] = []
    candidate_skills: List[str] = []
    matching_skills: List[str] = []
    missing_skills: List[str] = []


class CandidateMatchResult(BaseModel):
    candidate_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None
    years_of_experience: Optional[int] = None
    match_score: int
    reasoning: str
    strengths: List[str] = []
    gaps: List[str] = []
    recommendations: List[str] = []
    skills_comparison: SkillsComparison
    hourly_rate: Optional[float] = None
    availability: Optional[str] = None


class AutoMatchResponse(BaseModel):
    request_id: str
    request_number: str
    request_title: str
    job_description_preview: str
    total_candidates_evaluated: int
    total_matches: int
    auto_proposed: bool
    matches: List[CandidateMatchResult]


class CandidateSummary(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    current_title: Optional[str] = None
    proposed_rate: Optional[float] = None
    proposed_date: Optional[date] = None

    class Config:
        from_attributes = True


class RequestResponse(BaseModel):
    id: str
    request_number: str
    company_name: str
    request_title: str
    job_description: str
    prepared_rate: Optional[float] = None
    final_rate: Optional[float] = None
    request_date: date
    proposed_date: Optional[date] = None
    customer_feedback: Optional[str] = None
    contract_status: bool
    state: str
    created_at: datetime
    updated_at: datetime
    proposed_candidates: List[CandidateSummary] = []

    class Config:
        from_attributes = True


class RequestListItem(BaseModel):
    id: str
    request_number: str
    company_name: str
    request_title: str
    state: str
    prepared_rate: Optional[float] = None
    final_rate: Optional[float] = None
    request_date: date
    contract_status: bool
    created_at: datetime
    candidate_count: int = 0

    class Config:
        from_attributes = True


class RequestCountResponse(BaseModel):
    open_count: int
    in_progress_count: int
    total_active: int


async def _invalidate_requests_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:requests:*")
        if keys:
            await redis.delete(*keys)
        stats_keys = await redis.keys("hr_app:stats:*")
        if stats_keys:
            await redis.delete(*stats_keys)
    except Exception:
        pass


async def _generate_request_number(session: AsyncSession) -> str:
    year = datetime.now().year
    prefix = f"REQ-{year}-"
    result = await session.execute(
        select(func.count(StaffingRequest.id)).where(
            StaffingRequest.request_number.like(f"{prefix}%")
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{str(count + 1).zfill(3)}"


def _extract_skills_from_jd(job_description: str) -> List[str]:
    common_skills = [
        "python", "java", "javascript", "typescript", "golang", "rust", "c++", "c#",
        "react", "angular", "vue", "node.js", "fastapi", "django", "flask", "spring",
        "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
        "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
        "machine learning", "deep learning", "nlp", "ai", "data science",
        "sql", "nosql", "rest", "graphql", "grpc", "microservices",
        "git", "linux", "bash", "agile", "scrum",
    ]
    jd_lower = job_description.lower()
    found = []
    for skill in common_skills:
        if skill in jd_lower:
            found.append(skill)
    return found


def _build_skills_comparison(
    job_description: str,
    candidate_skills: List[str],
    structured_data: dict,
) -> SkillsComparison:
    jd_skills = _extract_skills_from_jd(job_description)

    all_candidate_skills = list(candidate_skills or [])
    if structured_data.get("skills"):
        for s in structured_data["skills"]:
            if s.lower() not in [x.lower() for x in all_candidate_skills]:
                all_candidate_skills.append(s)

    candidate_skills_lower = [s.lower() for s in all_candidate_skills]

    matching = [s for s in jd_skills if s.lower() in candidate_skills_lower]
    missing = [s for s in jd_skills if s.lower() not in candidate_skills_lower]

    return SkillsComparison(
        job_required_skills=jd_skills,
        candidate_skills=all_candidate_skills[:30],
        matching_skills=matching,
        missing_skills=missing,
    )


async def _get_structured_cv_for_candidate(session: AsyncSession, candidate: Candidate) -> dict:
    if candidate.json_data and isinstance(candidate.json_data, dict):
        return candidate.json_data

    if candidate.email and "@placeholder.com" not in candidate.email:
        result = await session.execute(
            select(ParsedResume).where(ParsedResume.email == candidate.email).limit(1)
        )
        pr = result.scalars().first()
        if pr and pr.json_data:
            return pr.json_data

    if candidate.first_name and candidate.last_name:
        result = await session.execute(
            select(ParsedResume).where(
                and_(
                    func.lower(ParsedResume.first_name) == candidate.first_name.lower(),
                    func.lower(ParsedResume.last_name) == candidate.last_name.lower(),
                )
            ).limit(1)
        )
        pr = result.scalars().first()
        if pr and pr.json_data:
            return pr.json_data

    cv = {}
    if candidate.first_name:
        cv["full_name"] = f"{candidate.first_name} {candidate.last_name}".strip()
    if candidate.email and "@placeholder.com" not in candidate.email:
        cv["email"] = candidate.email
    if candidate.skills:
        cv["skills"] = candidate.skills
    if candidate.current_title:
        cv["current_title"] = candidate.current_title
    if candidate.current_company:
        cv["current_company"] = candidate.current_company
    if candidate.location:
        cv["location"] = candidate.location
    if candidate.resume_text:
        cv["summary"] = candidate.resume_text[:2000]
    return cv


async def _match_single_candidate(
    candidate: Candidate,
    job_description: str,
    request_id: str,
) -> Optional[CandidateMatchResult]:
    try:
        async with async_session_maker() as session:
            structured_cv = await _get_structured_cv_for_candidate(session, candidate)

        if not structured_cv:
            return None

        ai_result = await ai_client.rag_match(
            job_description=job_description,
            structured_cv=structured_cv,
        )

        match_score = ai_result.get("match_score", 0)

        skills_comparison = _build_skills_comparison(
            job_description=job_description,
            candidate_skills=candidate.skills or [],
            structured_data=structured_cv,
        )

        clean_email = candidate.email
        if clean_email and ("@placeholder.com" in clean_email or clean_email.startswith("unknown_")):
            clean_email = None

        return CandidateMatchResult(
            candidate_id=str(candidate.id),
            first_name=candidate.first_name,
            last_name=candidate.last_name,
            email=clean_email,
            current_title=candidate.current_title,
            current_company=candidate.current_company,
            location=candidate.location,
            years_of_experience=candidate.years_of_experience,
            match_score=match_score,
            reasoning=ai_result.get("reasoning", ""),
            strengths=ai_result.get("strengths", []),
            gaps=ai_result.get("gaps", []),
            recommendations=ai_result.get("recommendations", []),
            skills_comparison=skills_comparison,
            hourly_rate=float(candidate.hourly_rate) if candidate.hourly_rate else None,
            availability=candidate.availability,
        )

    except Exception as e:
        logger.error("candidate_match_failed", candidate_id=str(candidate.id), error=str(e))
        return None


@router.get("/count", response_model=RequestCountResponse)
async def get_requests_count(session: AsyncSession = Depends(get_db_session)):
    cache_key = "hr_app:requests:count"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return RequestCountResponse(**json.loads(cached))
    except Exception:
        pass

    result = await session.execute(
        select(
            StaffingRequest.state,
            func.count(StaffingRequest.id).label("cnt")
        )
        .where(StaffingRequest.state.in_(["open", "in_progress"]))
        .group_by(StaffingRequest.state)
    )
    rows = result.fetchall()
    counts = {row.state: row.cnt for row in rows}
    open_count = counts.get("open", 0)
    in_progress_count = counts.get("in_progress", 0)

    response = RequestCountResponse(
        open_count=open_count,
        in_progress_count=in_progress_count,
        total_active=open_count + in_progress_count
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, 30, json.dumps(response.model_dump()))
    except Exception:
        pass

    return response


@router.post("/", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    data: RequestCreate,
    session: AsyncSession = Depends(get_db_session)
):
    request_number = await _generate_request_number(session)
    req = StaffingRequest(
        request_number=request_number,
        company_name=data.company_name,
        request_title=data.request_title,
        job_description=data.job_description,
        prepared_rate=data.prepared_rate,
        request_date=data.request_date,
        proposed_date=data.proposed_date,
        state="open",
        contract_status=False,
    )
    session.add(req)
    await session.flush()

    audit = RequestAuditLog(
        request_id=req.id,
        old_state=None,
        new_state="open",
        notes="Request created",
    )
    session.add(audit)
    await session.commit()
    await session.refresh(req)

    await _invalidate_requests_cache()

    return _build_response(req, [])


@router.get("/", response_model=List[RequestListItem])
async def list_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    state: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_db_session)
):
    cache_key = f"hr_app:requests:list:{skip}:{limit}:{state}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return [RequestListItem(**item) for item in json.loads(cached)]
    except Exception:
        pass

    stmt = (
        select(
            StaffingRequest,
            func.count(RequestCandidate.id).label("candidate_count")
        )
        .outerjoin(RequestCandidate, RequestCandidate.request_id == StaffingRequest.id)
        .group_by(StaffingRequest.id)
        .order_by(StaffingRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    if state:
        stmt = stmt.where(StaffingRequest.state == state)

    result = await session.execute(stmt)
    rows = result.fetchall()

    items = []
    for row in rows:
        req = row[0]
        cnt = row[1]
        items.append(RequestListItem(
            id=str(req.id),
            request_number=req.request_number,
            company_name=req.company_name,
            request_title=req.request_title,
            state=req.state,
            prepared_rate=float(req.prepared_rate) if req.prepared_rate else None,
            final_rate=float(req.final_rate) if req.final_rate else None,
            request_date=req.request_date,
            contract_status=req.contract_status,
            created_at=req.created_at,
            candidate_count=cnt,
        ))

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, 30, json.dumps([i.model_dump() for i in items], default=str))
    except Exception:
        pass

    return items


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(
    request_id: UUID,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    candidates = await _get_proposed_candidates(session, request_id)
    return _build_response(req, candidates)


@router.patch("/{request_id}", response_model=RequestResponse)
async def update_request(
    request_id: UUID,
    data: RequestUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    update_data = data.model_dump(exclude_none=True)

    if "contract_status" in update_data and update_data["contract_status"] is True:
        if req.state != "signed":
            raise HTTPException(status_code=400, detail="Contract can only be set when request is signed")

    for field, value in update_data.items():
        setattr(req, field, value)

    await session.commit()
    await session.refresh(req)

    await _invalidate_requests_cache()

    candidates = await _get_proposed_candidates(session, request_id)
    return _build_response(req, candidates)


@router.patch("/{request_id}/state", response_model=RequestResponse)
async def transition_state(
    request_id: UUID,
    data: StateTransition,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    allowed = VALID_TRANSITIONS.get(req.state, [])

    if data.new_state not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{req.state}' to '{data.new_state}'. Allowed: {allowed}"
        )

    old_state = req.state
    req.state = data.new_state

    if data.new_state == "signed":
        req.contract_status = True

    audit = RequestAuditLog(
        request_id=req.id,
        old_state=old_state,
        new_state=data.new_state,
        notes=data.notes,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(req)

    await _invalidate_requests_cache()

    candidates = await _get_proposed_candidates(session, request_id)
    return _build_response(req, candidates)


@router.post("/{request_id}/auto-match", response_model=AutoMatchResponse)
async def auto_match_candidates(
    request_id: UUID,
    data: AutoMatchRequest = AutoMatchRequest(),
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if not req.job_description or not req.job_description.strip():
        raise HTTPException(status_code=422, detail="Request has no job description to match against")

    candidates_result = await session.execute(
        select(Candidate)
        .where(
            Candidate.status == "active",
        )
        .order_by(Candidate.created_at.desc())
        .limit(50)
    )
    candidates = candidates_result.scalars().all()

    if not candidates:
        return AutoMatchResponse(
            request_id=str(req.id),
            request_number=req.request_number,
            request_title=req.request_title,
            job_description_preview=req.job_description[:200] + "..." if len(req.job_description) > 200 else req.job_description,
            total_candidates_evaluated=0,
            total_matches=0,
            auto_proposed=False,
            matches=[],
        )

    tasks = [
        _match_single_candidate(
            candidate=c,
            job_description=req.job_description,
            request_id=str(req.id),
        )
        for c in candidates
    ]

    all_results = await asyncio.gather(*tasks, return_exceptions=False)

    matches = [r for r in all_results if r is not None]
    matches.sort(key=lambda x: x.match_score, reverse=True)

    if data.min_score > 0:
        matches = [m for m in matches if m.match_score >= data.min_score]

    matches = matches[:data.top_k]

    auto_proposed = False
    if data.auto_propose and matches and req.state not in ["signed", "closed"]:
        for match in matches:
            existing = await session.execute(
                select(RequestCandidate).where(
                    and_(
                        RequestCandidate.request_id == request_id,
                        RequestCandidate.candidate_id == UUID(match.candidate_id)
                    )
                )
            )
            if not existing.scalar_one_or_none():
                rc = RequestCandidate(
                    request_id=request_id,
                    candidate_id=UUID(match.candidate_id),
                    proposed_rate=None,
                    proposed_date=date.today(),
                    notes=f"Auto-matched with {match.match_score}% score",
                )
                session.add(rc)

        if req.state == "open":
            req.state = "in_progress"
            audit = RequestAuditLog(
                request_id=req.id,
                old_state="open",
                new_state="in_progress",
                notes="Auto-transitioned via auto-match",
            )
            session.add(audit)

        await session.commit()
        await _invalidate_requests_cache()
        auto_proposed = True

    return AutoMatchResponse(
        request_id=str(req.id),
        request_number=req.request_number,
        request_title=req.request_title,
        job_description_preview=req.job_description[:200] + "..." if len(req.job_description) > 200 else req.job_description,
        total_candidates_evaluated=len(candidates),
        total_matches=len(matches),
        auto_proposed=auto_proposed,
        matches=matches,
    )


@router.post("/{request_id}/candidates", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def propose_candidate(
    request_id: UUID,
    data: ProposeCandidateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.state in ["signed", "closed"]:
        raise HTTPException(status_code=400, detail="Cannot propose candidates for a signed or closed request")

    candidate_result = await session.execute(
        select(Candidate).where(Candidate.id == data.candidate_id)
    )
    candidate = candidate_result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    existing = await session.execute(
        select(RequestCandidate).where(
            and_(
                RequestCandidate.request_id == request_id,
                RequestCandidate.candidate_id == data.candidate_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Candidate already proposed for this request")

    rc = RequestCandidate(
        request_id=request_id,
        candidate_id=data.candidate_id,
        proposed_rate=data.proposed_rate,
        proposed_date=date.today(),
        notes=data.notes,
    )
    session.add(rc)

    if req.state == "open":
        old_state = req.state
        req.state = "in_progress"
        audit = RequestAuditLog(
            request_id=req.id,
            old_state=old_state,
            new_state="in_progress",
            notes="Auto-transitioned when candidate proposed",
        )
        session.add(audit)

    await session.commit()
    await session.refresh(req)

    await _invalidate_requests_cache()

    candidates = await _get_proposed_candidates(session, request_id)
    return _build_response(req, candidates)


@router.delete("/{request_id}/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_candidate(
    request_id: UUID,
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.state in ["signed", "closed"]:
        raise HTTPException(status_code=400, detail="Cannot remove candidates from a signed or closed request")

    rc_result = await session.execute(
        select(RequestCandidate).where(
            and_(
                RequestCandidate.request_id == request_id,
                RequestCandidate.candidate_id == candidate_id
            )
        )
    )
    rc = rc_result.scalar_one_or_none()

    if not rc:
        raise HTTPException(status_code=404, detail="Candidate not proposed for this request")

    await session.delete(rc)
    await session.commit()

    await _invalidate_requests_cache()


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(
    request_id: UUID,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(StaffingRequest).where(StaffingRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    await session.delete(req)
    await session.commit()

    await _invalidate_requests_cache()


async def _get_proposed_candidates(session: AsyncSession, request_id: UUID) -> List[CandidateSummary]:
    stmt = (
        select(
            Candidate.id,
            Candidate.first_name,
            Candidate.last_name,
            Candidate.email,
            Candidate.current_title,
            RequestCandidate.proposed_rate,
            RequestCandidate.proposed_date,
        )
        .join(RequestCandidate, RequestCandidate.candidate_id == Candidate.id)
        .where(RequestCandidate.request_id == request_id)
        .order_by(RequestCandidate.created_at.asc())
    )
    result = await session.execute(stmt)
    rows = result.fetchall()

    return [
        CandidateSummary(
            id=str(row.id),
            first_name=row.first_name,
            last_name=row.last_name,
            email=row.email if row.email and "@placeholder.com" not in row.email else None,
            current_title=row.current_title,
            proposed_rate=float(row.proposed_rate) if row.proposed_rate else None,
            proposed_date=row.proposed_date,
        )
        for row in rows
    ]


def _build_response(req: StaffingRequest, candidates: List[CandidateSummary]) -> RequestResponse:
    return RequestResponse(
        id=str(req.id),
        request_number=req.request_number,
        company_name=req.company_name,
        request_title=req.request_title,
        job_description=req.job_description,
        prepared_rate=float(req.prepared_rate) if req.prepared_rate else None,
        final_rate=float(req.final_rate) if req.final_rate else None,
        request_date=req.request_date,
        proposed_date=req.proposed_date,
        customer_feedback=req.customer_feedback,
        contract_status=req.contract_status,
        state=req.state,
        created_at=req.created_at,
        updated_at=req.updated_at,
        proposed_candidates=candidates,
    )