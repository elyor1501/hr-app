import hashlib
from typing import Any, List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Candidate, CandidateCV, CandidateAttachment, ParsedResume
from src.db.session import get_db_session
from src.services.storage import (
    upload_candidate_cv,
    upload_candidate_attachment,
    delete_candidate_cv_from_storage,
    delete_candidate_attachment_from_storage,
)
from src.api.deps import get_current_user
from src.models.auth import TokenPayload

logger = structlog.get_logger()
router = APIRouter()

ALLOWED_CV_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

ALLOWED_ATTACHMENT_TYPES = [
    "Certification",
    "Portfolio",
    "Qualification",
    "License",
    "Cover Letter",
    "Reference Letter",
    "Other",
]

PROFILE_CACHE_TTL = 1800


def _clean_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    if "@placeholder.com" in email:
        return None
    if "@noemail.vaspp.com" in email:
        return None
    if email.startswith("unknown_"):
        return None
    return email


class CVResponse(BaseModel):
    id: str
    candidate_id: str
    file_name: str
    file_url: str
    is_primary: bool
    file_size: Optional[int] = None
    attachment_type: Optional[str] = None
    deloitte_pptx_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: str
    candidate_id: str
    file_name: str
    file_url: str
    attachment_type: str
    file_size: Optional[int] = None
    created_at: str

    class Config:
        from_attributes = True


class CandidateProfileResponse(BaseModel):
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    education: Optional[List[Any]] = None
    experience: Optional[List[Any]] = None
    projects: Optional[List[Any]] = None
    certifications: Optional[List[Any]] = None
    experience_level: Optional[str] = None
    hourly_rate: Optional[float] = None
    availability: Optional[str] = None
    status: Optional[str] = None
    candidate_status: Optional[str] = None
    vendor: Optional[str] = None
    rate_type: Optional[str] = None
    currency: Optional[str] = None
    daily_rate: Optional[float] = None
    proposed_rate: Optional[float] = None
    proposed_rate_type: Optional[str] = None
    proposed_daily_rate: Optional[float] = None
    proposed_currency: Optional[str] = None
    dob: Optional[str] = None
    ssn_last4: Optional[str] = None
    work_authorization: Optional[str] = None
    interview_availability: Optional[str] = None
    willing_to_travel: Optional[bool] = None
    willing_inperson: Optional[bool] = None
    us_experience: Optional[int] = None
    pending_offers: Optional[bool] = None
    pending_offers_details: Optional[str] = None
    sap_email: Optional[str] = None
    sap_cuser: Optional[str] = None
    sap_secure_id: Optional[str] = None
    cvs: List[CVResponse] = []
    attachments: List[AttachmentResponse] = []
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


async def _get_candidate_or_404(session: AsyncSession, candidate_id: UUID) -> Candidate:
    candidate = await session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


async def _get_parsed_resume_for_candidate(session: AsyncSession, candidate: Candidate) -> Optional[ParsedResume]:
    if candidate.email and "@placeholder.com" not in candidate.email:
        result = await session.execute(
            select(ParsedResume).where(ParsedResume.email == candidate.email).limit(1)
        )
        pr = result.scalars().first()
        if pr:
            return pr

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
        if pr:
            return pr

    return None


def _cv_to_response(cv: CandidateCV, attachment_type: Optional[str] = None) -> CVResponse:
    return CVResponse(
        id=str(cv.id),
        candidate_id=str(cv.candidate_id),
        file_name=cv.file_name,
        file_url=cv.file_url,
        is_primary=cv.is_primary,
        file_size=cv.file_size,
        attachment_type=attachment_type,
        deloitte_pptx_url=cv.deloitte_pptx_url,
        created_at=cv.created_at.isoformat(),
    )


def _attachment_to_response(att: CandidateAttachment) -> AttachmentResponse:
    return AttachmentResponse(
        id=str(att.id),
        candidate_id=str(att.candidate_id),
        file_name=att.file_name,
        file_url=att.file_url,
        attachment_type=att.attachment_type,
        file_size=att.file_size,
        created_at=att.created_at.isoformat(),
    )


@router.get("/{candidate_id}/profile", response_model=CandidateProfileResponse)
async def get_candidate_profile(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    from src.core.redis import get_redis_pool
    import json
    from sqlalchemy import text

    cache_key = f"hr_app:candidate_profile:{candidate_id}"
    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return CandidateProfileResponse(**json.loads(cached))
    except Exception:
        pass

    result = await session.execute(
        text("""
            SELECT
                c.id, c.first_name, c.last_name, c.email, c.phone,
                c.current_title, c.current_company, c.years_of_experience,
                c.skills, c.location, c.status, c.linkedin_url,
                c.experience_level, c.hourly_rate, c.availability,
                c.vendor, c.rate_type, c.currency, c.daily_rate,
                c.proposed_rate, c.proposed_rate_type, c.proposed_daily_rate,
                c.proposed_currency, c.json_data, c.created_at, c.updated_at,
                c.dob, c.ssn_last4, c.work_authorization, c.interview_availability,
                c.willing_to_travel, c.willing_inperson, c.us_experience,
                c.pending_offers, c.pending_offers_details,
                c.sap_email, c.sap_cuser, c.sap_secure_id,
                pr.github, pr.portfolio, pr.summary,
                pr.education, pr.experience, pr.projects,
                pr.certifications, pr.candidate_status
            FROM candidates c
            LEFT JOIN parsed_resumes pr
                ON lower(pr.email) = lower(c.email)
                AND pr.email NOT LIKE '%@noemail.vaspp.com%'
                AND pr.email NOT LIKE '%@placeholder.com%'
            WHERE c.id = :candidate_id
            LIMIT 1
        """),
        {"candidate_id": str(candidate_id)}
    )
    row = result.mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cvs_result = await session.execute(
        select(CandidateCV)
        .where(CandidateCV.candidate_id == candidate_id)
        .order_by(CandidateCV.is_primary.desc(), CandidateCV.created_at.desc())
    )
    cvs = cvs_result.scalars().all()

    attachments_result = await session.execute(
        select(CandidateAttachment)
        .where(CandidateAttachment.candidate_id == candidate_id)
        .order_by(CandidateAttachment.created_at.desc())
    )
    attachments = attachments_result.scalars().all()

    json_data = row["json_data"] or {}

    github = row["github"] if row["github"] else json_data.get("github")
    portfolio = row["portfolio"] if row["portfolio"] else json_data.get("portfolio")
    summary = row["summary"] if row["summary"] else json_data.get("summary")
    education = row["education"] if row["education"] else json_data.get("education")
    experience = row["experience"] if row["experience"] else json_data.get("experience")
    projects = row["projects"] if row["projects"] else json_data.get("projects")
    certifications = row["certifications"] if row["certifications"] else json_data.get("certifications")

    if not row["github"] and not row["summary"]:
        pr_name_result = await session.execute(
            select(ParsedResume).where(
                and_(
                    func.lower(ParsedResume.first_name) == (row["first_name"] or "").lower(),
                    func.lower(ParsedResume.last_name) == (row["last_name"] or "").lower(),
                )
            ).limit(1)
        )
        pr_by_name = pr_name_result.scalars().first()
        if pr_by_name:
            github = github or pr_by_name.github
            portfolio = portfolio or pr_by_name.portfolio
            summary = summary or pr_by_name.summary
            education = education or pr_by_name.education
            experience = experience or pr_by_name.experience
            projects = projects or pr_by_name.projects
            certifications = certifications or pr_by_name.certifications

    response = CandidateProfileResponse(
        id=str(row["id"]),
        first_name=row["first_name"],
        last_name=row["last_name"],
        email=_clean_email(row["email"]),
        phone=row["phone"],
        current_title=row["current_title"],
        current_company=row["current_company"],
        years_of_experience=row["years_of_experience"],
        skills=row["skills"],
        location=row["location"],
        linkedin_url=row["linkedin_url"],
        github=github,
        portfolio=portfolio,
        summary=summary,
        education=education,
        experience=experience,
        projects=projects,
        certifications=certifications,
        experience_level=row["experience_level"],
        hourly_rate=float(row["hourly_rate"]) if row["hourly_rate"] else None,
        availability=row["availability"],
        status=row["status"],
        candidate_status=row["candidate_status"],
        vendor=row["vendor"],
        rate_type=row["rate_type"],
        currency=row["currency"],
        daily_rate=float(row["daily_rate"]) if row["daily_rate"] else None,
        proposed_rate=float(row["proposed_rate"]) if row["proposed_rate"] else None,
        proposed_rate_type=row["proposed_rate_type"],
        proposed_daily_rate=float(row["proposed_daily_rate"]) if row["proposed_daily_rate"] else None,
        proposed_currency=row["proposed_currency"],
        dob=row["dob"],
        ssn_last4=row["ssn_last4"],
        work_authorization=row["work_authorization"],
        interview_availability=row["interview_availability"],
        willing_to_travel=row["willing_to_travel"],
        willing_inperson=row["willing_inperson"],
        us_experience=row["us_experience"],
        pending_offers=row["pending_offers"],
        pending_offers_details=row["pending_offers_details"],
        sap_email=row["sap_email"],
        sap_cuser=row["sap_cuser"],
        sap_secure_id=row["sap_secure_id"],
        cvs=[_cv_to_response(cv) for cv in cvs],
        attachments=[_attachment_to_response(att) for att in attachments],
        created_at=row["created_at"].isoformat(),
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, PROFILE_CACHE_TTL, json.dumps(response.model_dump(), default=str))
    except Exception:
        pass

    return response


@router.get("/{candidate_id}/cvs", response_model=List[CVResponse])
async def list_cvs(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateCV)
        .where(CandidateCV.candidate_id == candidate_id)
        .order_by(CandidateCV.is_primary.desc(), CandidateCV.created_at.desc())
    )
    cvs = result.scalars().all()
    return [_cv_to_response(cv) for cv in cvs]


@router.post("/{candidate_id}/cvs", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    candidate_id: UUID,
    file: UploadFile = File(...),
    attachment_type: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: TokenPayload = Depends(get_current_user),
):
    await _get_candidate_or_404(session, candidate_id)

    if file.content_type not in ALLOWED_CV_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF and Word documents are allowed."
        )

    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()

    existing_hash = await session.execute(
        select(CandidateCV).where(
            and_(
                CandidateCV.candidate_id == candidate_id,
                CandidateCV.file_hash == file_hash
            )
        )
    )
    if existing_hash.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This exact CV has already been uploaded for this candidate."
        )

    file.file.seek(0)
    file_url = await upload_candidate_cv(file)

    if not file_url:
        raise HTTPException(status_code=500, detail="File upload failed")

    existing_cvs = await session.execute(
        select(func.count(CandidateCV.id)).where(CandidateCV.candidate_id == candidate_id)
    )
    cv_count = existing_cvs.scalar() or 0
    is_primary = cv_count == 0

    cv = CandidateCV(
        candidate_id=candidate_id,
        file_name=file.filename or "cv.pdf",
        file_url=file_url,
        file_hash=file_hash,
        is_primary=is_primary,
        file_size=len(file_content),
    )
    session.add(cv)
    await session.commit()
    await session.refresh(cv)

    logger.info(
        "cv_uploaded",
        uploaded_by=current_user.sub,
        candidate_id=str(candidate_id),
        file_name=file.filename,
        file_size=len(file_content),
        is_primary=is_primary,
        cv_id=str(cv.id),
    )

    try:
        from src.core.redis import get_redis_pool
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate_profile:{candidate_id}")
    except Exception:
        pass

    return _cv_to_response(cv, attachment_type)


@router.patch("/{candidate_id}/cvs/{cv_id}/set-primary", response_model=CVResponse)
async def set_primary_cv(
    candidate_id: UUID,
    cv_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    target_cv = await session.execute(
        select(CandidateCV).where(
            and_(CandidateCV.id == cv_id, CandidateCV.candidate_id == candidate_id)
        )
    )
    cv = target_cv.scalar_one_or_none()

    if not cv:
        raise HTTPException(status_code=404, detail="CV not found for this candidate")

    all_cvs = await session.execute(
        select(CandidateCV).where(CandidateCV.candidate_id == candidate_id)
    )
    for existing_cv in all_cvs.scalars().all():
        existing_cv.is_primary = existing_cv.id == cv_id

    await session.commit()
    await session.refresh(cv)

    try:
        from src.core.redis import get_redis_pool
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate_profile:{candidate_id}")
    except Exception:
        pass

    return _cv_to_response(cv)


@router.delete("/{candidate_id}/cvs/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(
    candidate_id: UUID,
    cv_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    count_result = await session.execute(
        select(func.count(CandidateCV.id)).where(CandidateCV.candidate_id == candidate_id)
    )
    cv_count = count_result.scalar() or 0

    if cv_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the only CV. A candidate must have at least 1 CV."
        )

    cv_result = await session.execute(
        select(CandidateCV).where(
            and_(CandidateCV.id == cv_id, CandidateCV.candidate_id == candidate_id)
        )
    )
    cv = cv_result.scalar_one_or_none()

    if not cv:
        raise HTTPException(status_code=404, detail="CV not found for this candidate")

    was_primary = cv.is_primary

    try:
        await delete_candidate_cv_from_storage(cv.file_url)
    except Exception:
        pass

    await session.delete(cv)
    await session.flush()

    if was_primary:
        next_cv_result = await session.execute(
            select(CandidateCV)
            .where(CandidateCV.candidate_id == candidate_id)
            .order_by(CandidateCV.created_at.desc())
            .limit(1)
        )
        next_cv = next_cv_result.scalar_one_or_none()
        if next_cv:
            next_cv.is_primary = True

    await session.commit()

    try:
        from src.core.redis import get_redis_pool
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate_profile:{candidate_id}")
    except Exception:
        pass


@router.get("/{candidate_id}/attachments", response_model=List[AttachmentResponse])
async def list_attachments(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateAttachment)
        .where(CandidateAttachment.candidate_id == candidate_id)
        .order_by(CandidateAttachment.created_at.desc())
    )
    attachments = result.scalars().all()
    return [_attachment_to_response(att) for att in attachments]


@router.post("/{candidate_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    candidate_id: UUID,
    attachment_type: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
    current_user: TokenPayload = Depends(get_current_user),
):
    await _get_candidate_or_404(session, candidate_id)

    if attachment_type not in ALLOWED_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid attachment type. Must be one of: {ALLOWED_ATTACHMENT_TYPES}"
        )

    file_content = await file.read()
    file.file.seek(0)
    file_url = await upload_candidate_attachment(file)

    if not file_url:
        raise HTTPException(status_code=500, detail="File upload failed")

    attachment = CandidateAttachment(
        candidate_id=candidate_id,
        file_name=file.filename or "attachment",
        file_url=file_url,
        attachment_type=attachment_type,
        file_size=len(file_content),
    )
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)

    logger.info(
        "attachment_uploaded",
        uploaded_by=current_user.sub,
        candidate_id=str(candidate_id),
        file_name=file.filename,
        attachment_type=attachment_type,
        file_size=len(file_content),
        attachment_id=str(attachment.id),
    )

    try:
        from src.core.redis import get_redis_pool
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate_profile:{candidate_id}")
    except Exception:
        pass

    return _attachment_to_response(attachment)


@router.delete("/{candidate_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    candidate_id: UUID,
    attachment_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateAttachment).where(
            and_(
                CandidateAttachment.id == attachment_id,
                CandidateAttachment.candidate_id == candidate_id
            )
        )
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found for this candidate")

    try:
        await delete_candidate_attachment_from_storage(attachment.file_url)
    except Exception:
        pass

    await session.delete(attachment)
    await session.commit()

    try:
        from src.core.redis import get_redis_pool
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:candidate_profile:{candidate_id}")
    except Exception:
        pass