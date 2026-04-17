from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db_session
from src.db.models import StaffingRequest, RequestCandidate, RequestAuditLog, Candidate

logger = structlog.get_logger()
router = APIRouter()

VALID_TRANSITIONS = {
    "open": ["in_progress"],
    "in_progress": ["signed", "closed"],
    "signed": [],
    "closed": [],
}

ATTACHMENT_TYPES = ["Certification", "Portfolio", "License", "Cover Letter", "Reference Letter", "Other"]


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


class CandidateSummary(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
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


@router.get("/count", response_model=RequestCountResponse)
async def get_requests_count(session: AsyncSession = Depends(get_db_session)):
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
    return RequestCountResponse(
        open_count=open_count,
        in_progress_count=in_progress_count,
        total_active=open_count + in_progress_count
    )


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

    return _build_response(req, [])


@router.get("/", response_model=List[RequestListItem])
async def list_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    state: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_db_session)
):
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

    return items


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(
    request_id: UUID,
    session: AsyncSession = Depends(get_db_session)
):
    stmt = (
        select(StaffingRequest)
        .where(StaffingRequest.id == request_id)
    )
    result = await session.execute(stmt)
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

    candidates = await _get_proposed_candidates(session, request_id)
    return _build_response(req, candidates)


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
            email=row.email,
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