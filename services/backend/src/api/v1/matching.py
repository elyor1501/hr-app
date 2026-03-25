from typing import Any, Dict, List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, cast, Text, func

from src.db.session import async_session_maker
from src.db.models import Candidate, ParsedResume, Job
from src.services.ai_client import AIClient

logger = structlog.get_logger()
router = APIRouter()
ai_client = AIClient()


class MatchByIdRequest(BaseModel):
    job_id: str = Field(...)
    candidate_id: str = Field(...)


class RawMatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    structured_cv: dict = Field(...)


class BulkMatchRequest(BaseModel):
    job_id: str = Field(...)
    candidate_ids: List[str] = Field(..., min_length=1, max_length=20)


class CandidateToJobsRequest(BaseModel):
    candidate_id: str = Field(...)
    job_ids: Optional[List[str]] = Field(default=None)
    top_k: Optional[int] = Field(default=10, ge=1, le=50)
    min_score: Optional[int] = Field(default=0, ge=0, le=100)
    match_all_jobs: Optional[bool] = Field(default=True)


class JobToCandidatesRequest(BaseModel):
    job_id: str = Field(...)
    top_k: Optional[int] = Field(default=10, ge=1, le=50)
    min_score: Optional[int] = Field(default=0, ge=0, le=100)
    match_all_candidates: Optional[bool] = Field(default=True)


class MatchResultResponse(BaseModel):
    job_id: str
    job_title: Optional[str] = None
    candidate_id: str
    candidate_name: Optional[str] = None
    match_score: int = 0
    reasoning: str = ""
    strengths: List[str] = []
    gaps: List[str] = []
    recommendations: List[str] = []


class BulkMatchResponse(BaseModel):
    job_id: str
    total: int
    results: List[MatchResultResponse]


class CandidateToJobsResponse(BaseModel):
    candidate_id: str
    candidate_name: Optional[str] = None
    total_jobs_evaluated: int
    total_matches: int
    results: List[MatchResultResponse]


class JobToCandidatesResponse(BaseModel):
    job_id: str
    job_title: Optional[str] = None
    total_candidates_evaluated: int
    total_matches: int
    results: List[MatchResultResponse]


def _build_cv_from_parsed_resume(pr) -> dict:
    cv = {}
    name_parts = []
    if pr.first_name:
        name_parts.append(pr.first_name)
    if pr.last_name:
        name_parts.append(pr.last_name)
    if name_parts:
        cv["full_name"] = " ".join(name_parts)
    if pr.email:
        cv["email"] = pr.email
    if pr.phone:
        cv["phone"] = pr.phone
    if pr.current_title:
        cv["current_title"] = pr.current_title
    if pr.current_company:
        cv["current_company"] = pr.current_company
    if pr.skills:
        cv["skills"] = pr.skills
    if pr.location:
        cv["location"] = pr.location
    if pr.years_of_experience is not None:
        cv["years_of_experience"] = pr.years_of_experience
    if pr.summary:
        cv["summary"] = pr.summary
    if pr.education:
        cv["education"] = pr.education
    if pr.experience:
        cv["experience"] = pr.experience
    if pr.projects:
        cv["projects"] = pr.projects
    if pr.certifications:
        cv["certifications"] = pr.certifications
    if pr.linkedin_url:
        cv["linkedin_url"] = pr.linkedin_url
    if pr.github:
        cv["github"] = pr.github
    if pr.portfolio:
        cv["portfolio"] = pr.portfolio
    return cv


def _build_cv_from_candidate(c) -> dict:
    cv = {}
    name_parts = []
    if c.first_name:
        name_parts.append(c.first_name)
    if c.last_name:
        name_parts.append(c.last_name)
    if name_parts:
        cv["full_name"] = " ".join(name_parts)
    if c.email:
        cv["email"] = c.email
    if c.phone:
        cv["phone"] = c.phone
    if c.current_title:
        cv["current_title"] = c.current_title
    if c.current_company:
        cv["current_company"] = c.current_company
    if c.skills:
        cv["skills"] = c.skills
    if c.location:
        cv["location"] = c.location
    if c.years_of_experience is not None:
        cv["years_of_experience"] = c.years_of_experience
    if c.resume_text:
        cv["summary"] = c.resume_text[:2000]
    if c.linkedin_url:
        cv["linkedin_url"] = c.linkedin_url
    return cv


def _cv_has_good_data(cv: dict) -> bool:
    if not cv:
        return False
    has_skills = bool(cv.get("skills")) and len(cv.get("skills", [])) > 2
    has_experience = bool(cv.get("experience"))
    has_education = bool(cv.get("education"))
    has_summary = bool(cv.get("summary"))
    return has_skills or has_experience or has_education or has_summary


async def _get_job_description(session, job_id: str) -> str:
    job = await session.get(Job, UUID(job_id))
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if not job.description:
        raise HTTPException(status_code=422, detail="Job has no description")
    return job.description


async def _get_job_title(session, job_id: str) -> Optional[str]:
    job = await session.get(Job, UUID(job_id))
    if job:
        return job.title
    return None


async def _find_best_parsed_resume(session, candidate) -> Optional[dict]:
    if candidate.email:
        result = await session.execute(
            select(ParsedResume).where(ParsedResume.email == candidate.email)
        )
        pr = result.scalar_one_or_none()
        if pr:
            if pr.json_data and isinstance(pr.json_data, dict) and _cv_has_good_data(pr.json_data):
                return pr.json_data
            cv = _build_cv_from_parsed_resume(pr)
            if _cv_has_good_data(cv):
                return cv

    if candidate.first_name and candidate.last_name:
        result = await session.execute(
            select(ParsedResume).where(
                func.lower(ParsedResume.first_name) == candidate.first_name.lower(),
                func.lower(ParsedResume.last_name) == candidate.last_name.lower(),
            )
        )
        pr = result.scalar_one_or_none()
        if pr:
            if pr.json_data and isinstance(pr.json_data, dict) and _cv_has_good_data(pr.json_data):
                return pr.json_data
            cv = _build_cv_from_parsed_resume(pr)
            if _cv_has_good_data(cv):
                return cv

    if candidate.first_name:
        result = await session.execute(
            select(ParsedResume).where(
                func.lower(ParsedResume.first_name) == candidate.first_name.lower()
            )
        )
        prs = result.scalars().all()
        for pr in prs:
            if pr.json_data and isinstance(pr.json_data, dict) and _cv_has_good_data(pr.json_data):
                return pr.json_data
            cv = _build_cv_from_parsed_resume(pr)
            if _cv_has_good_data(cv):
                return cv

    return None


async def _get_structured_cv_for_parsed_resume(pr) -> dict:
    if pr.json_data and isinstance(pr.json_data, dict) and _cv_has_good_data(pr.json_data):
        return pr.json_data
    cv = _build_cv_from_parsed_resume(pr)
    if _cv_has_good_data(cv):
        return cv
    if pr.json_data and isinstance(pr.json_data, dict):
        return pr.json_data
    return cv


async def _get_structured_cv_by_id(session, candidate_id: str) -> dict:
    try:
        uid = UUID(candidate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")

    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == uid)
    )
    parsed = result.scalar_one_or_none()
    if parsed:
        cv = await _get_structured_cv_for_parsed_resume(parsed)
        if _cv_has_good_data(cv):
            return cv

    result2 = await session.execute(
        select(ParsedResume).where(ParsedResume.resume_id == uid)
    )
    parsed2 = result2.scalar_one_or_none()
    if parsed2:
        cv = await _get_structured_cv_for_parsed_resume(parsed2)
        if _cv_has_good_data(cv):
            return cv

    candidate = await session.get(Candidate, uid)
    if candidate:
        pr_cv = await _find_best_parsed_resume(session, candidate)
        if pr_cv and _cv_has_good_data(pr_cv):
            return pr_cv

        if candidate.json_data and isinstance(candidate.json_data, dict) and _cv_has_good_data(candidate.json_data):
            return candidate.json_data

        cv = _build_cv_from_candidate(candidate)
        if _cv_has_good_data(cv):
            return cv

        if candidate.json_data and isinstance(candidate.json_data, dict):
            return candidate.json_data
        return cv

    all_pr = await session.execute(select(ParsedResume).limit(50))
    for pr in all_pr.scalars().all():
        pr_name = f"{pr.first_name or ''} {pr.last_name or ''}".strip().lower()
        if not pr_name:
            continue
        c_check = await session.get(Candidate, uid)
        if not c_check:
            continue
        c_name = f"{c_check.first_name or ''} {c_check.last_name or ''}".strip().lower()
        if c_name and pr_name and (c_name in pr_name or pr_name in c_name):
            cv = await _get_structured_cv_for_parsed_resume(pr)
            if _cv_has_good_data(cv):
                return cv

    raise HTTPException(
        status_code=422,
        detail="No structured resume data found for this candidate"
    )


async def _get_name_by_id(session, candidate_id: str) -> Optional[str]:
    try:
        uid = UUID(candidate_id)
    except ValueError:
        return None

    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == uid)
    )
    parsed = result.scalar_one_or_none()
    if parsed:
        name = f"{parsed.first_name or ''} {parsed.last_name or ''}".strip()
        if name:
            return name

    result2 = await session.execute(
        select(ParsedResume).where(ParsedResume.resume_id == uid)
    )
    parsed2 = result2.scalar_one_or_none()
    if parsed2:
        name = f"{parsed2.first_name or ''} {parsed2.last_name or ''}".strip()
        if name:
            return name

    candidate = await session.get(Candidate, uid)
    if candidate:
        name = f"{candidate.first_name or ''} {candidate.last_name or ''}".strip()
        if name:
            return name

    return None


async def _get_all_open_jobs(session, limit: int = 50):
    result = await session.execute(
        select(Job)
        .where(
            Job.status == "open",
            Job.description.isnot(None),
        )
        .limit(limit)
    )
    return list(result.scalars().all())


async def _get_all_parsed_resumes(session, limit: int = 50):
    result = await session.execute(
        select(ParsedResume)
        .limit(limit)
    )
    return list(result.scalars().all())


async def _find_parsed_resumes_for_job(session, job, limit: int = 20):
    search_terms = []
    if job.required_skills:
        search_terms.extend(job.required_skills)
    if job.preferred_skills:
        search_terms.extend(job.preferred_skills)
    if job.title:
        search_terms.extend([w for w in job.title.split() if len(w) >= 3])

    if search_terms:
        conditions = []
        for term in search_terms:
            pattern = f"%{term.strip()}%"
            conditions.append(
                func.coalesce(
                    func.array_to_string(ParsedResume.skills, ',', ''), ''
                ).ilike(pattern)
            )
            conditions.append(
                func.coalesce(ParsedResume.current_title, '').ilike(pattern)
            )
            conditions.append(
                func.coalesce(ParsedResume.current_company, '').ilike(pattern)
            )
            conditions.append(
                func.coalesce(ParsedResume.summary, '').ilike(pattern)
            )
            conditions.append(
                func.coalesce(cast(ParsedResume.json_data, Text), '').ilike(pattern)
            )
            conditions.append(
                func.coalesce(cast(ParsedResume.experience, Text), '').ilike(pattern)
            )
            conditions.append(
                func.coalesce(cast(ParsedResume.education, Text), '').ilike(pattern)
            )

        query = (
            select(ParsedResume)
            .where(or_(*conditions))
            .limit(limit)
        )
        result = await session.execute(query)
        parsed_resumes = list(result.scalars().all())

        if parsed_resumes:
            return parsed_resumes

    fallback_query = (
        select(ParsedResume)
        .limit(limit)
    )
    fallback_result = await session.execute(fallback_query)
    return list(fallback_result.scalars().all())


@router.post("", response_model=MatchResultResponse)
async def match_candidate_to_job(request: MatchByIdRequest):
    try:
        async with async_session_maker() as session:
            job_description = await _get_job_description(
                session, request.job_id
            )
            job_title = await _get_job_title(
                session, request.job_id
            )
            structured_cv = await _get_structured_cv_by_id(
                session, request.candidate_id
            )
            candidate_name = await _get_name_by_id(
                session, request.candidate_id
            )

        if not candidate_name:
            candidate_name = (
                (structured_cv.get("full_name") or "").strip() or None
            )

        ai_result = await ai_client.rag_match(
            job_description=job_description,
            structured_cv=structured_cv,
        )

        return MatchResultResponse(
            job_id=request.job_id,
            job_title=job_title,
            candidate_id=request.candidate_id,
            candidate_name=candidate_name,
            match_score=ai_result.get("match_score", 0),
            reasoning=ai_result.get("reasoning", ""),
            strengths=ai_result.get("strengths", []),
            gaps=ai_result.get("gaps", []),
            recommendations=ai_result.get("recommendations", []),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "match_failed",
            error=str(e),
            job_id=request.job_id,
            candidate_id=request.candidate_id,
        )
        raise HTTPException(
            status_code=500, detail=f"Match failed: {str(e)}"
        )


@router.post("/raw")
async def match_raw(request: RawMatchRequest):
    try:
        result = await ai_client.rag_match(
            job_description=request.job_description,
            structured_cv=request.structured_cv,
        )
        return result
    except Exception as e:
        logger.error("raw_match_failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Match failed: {str(e)}"
        )


@router.post("/bulk", response_model=BulkMatchResponse)
async def match_bulk(request: BulkMatchRequest):
    try:
        async with async_session_maker() as session:
            job_description = await _get_job_description(
                session, request.job_id
            )
            job_title = await _get_job_title(
                session, request.job_id
            )

            results: List[MatchResultResponse] = []

            for cid in request.candidate_ids:
                try:
                    structured_cv = await _get_structured_cv_by_id(session, cid)
                    candidate_name = await _get_name_by_id(session, cid)
                    if not candidate_name:
                        candidate_name = (
                            (structured_cv.get("full_name") or "").strip() or None
                        )

                    ai_result = await ai_client.rag_match(
                        job_description=job_description,
                        structured_cv=structured_cv,
                    )

                    results.append(
                        MatchResultResponse(
                            job_id=request.job_id,
                            job_title=job_title,
                            candidate_id=cid,
                            candidate_name=candidate_name,
                            match_score=ai_result.get("match_score", 0),
                            reasoning=ai_result.get("reasoning", ""),
                            strengths=ai_result.get("strengths", []),
                            gaps=ai_result.get("gaps", []),
                            recommendations=ai_result.get("recommendations", []),
                        )
                    )
                except HTTPException:
                    results.append(
                        MatchResultResponse(
                            job_id=request.job_id,
                            job_title=job_title,
                            candidate_id=cid,
                            match_score=0,
                            reasoning="Failed to process this candidate",
                        )
                    )
                except Exception as exc:
                    logger.error("bulk_match_item_failed", candidate_id=cid, error=str(exc))
                    results.append(
                        MatchResultResponse(
                            job_id=request.job_id,
                            job_title=job_title,
                            candidate_id=cid,
                            match_score=0,
                            reasoning=f"Error: {str(exc)}",
                        )
                    )

        return BulkMatchResponse(
            job_id=request.job_id,
            total=len(results),
            results=results,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("bulk_match_failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Bulk match failed: {str(e)}"
        )


@router.post("/job-to-candidates", response_model=JobToCandidatesResponse)
async def match_job_to_candidates(request: JobToCandidatesRequest):
    try:
        async with async_session_maker() as session:
            job = await session.get(Job, UUID(request.job_id))
            if not job:
                raise HTTPException(status_code=404, detail=f"Job {request.job_id} not found")
            if not job.description:
                raise HTTPException(status_code=422, detail="Job has no description")

            if request.match_all_candidates:
                parsed_resumes = await _get_all_parsed_resumes(
                    session, limit=(request.top_k or 10) * 5
                )
            else:
                parsed_resumes = await _find_parsed_resumes_for_job(
                    session, job, limit=(request.top_k or 10) * 3
                )

            if not parsed_resumes:
                return JobToCandidatesResponse(
                    job_id=request.job_id,
                    job_title=job.title,
                    total_candidates_evaluated=0,
                    total_matches=0,
                    results=[],
                )

            results: List[MatchResultResponse] = []

            for pr in parsed_resumes:
                try:
                    structured_cv = await _get_structured_cv_for_parsed_resume(pr)

                    if not structured_cv or not _cv_has_good_data(structured_cv):
                        continue

                    ai_result = await ai_client.rag_match(
                        job_description=job.description,
                        structured_cv=structured_cv,
                    )

                    match_score = ai_result.get("match_score", 0)

                    candidate_name = f"{pr.first_name or ''} {pr.last_name or ''}".strip()
                    if not candidate_name:
                        candidate_name = (structured_cv.get("full_name") or "").strip() or "Unknown"

                    results.append(
                        MatchResultResponse(
                            job_id=request.job_id,
                            job_title=job.title,
                            candidate_id=str(pr.id),
                            candidate_name=candidate_name,
                            match_score=match_score,
                            reasoning=ai_result.get("reasoning", ""),
                            strengths=ai_result.get("strengths", []),
                            gaps=ai_result.get("gaps", []),
                            recommendations=ai_result.get("recommendations", []),
                        )
                    )

                except Exception as exc:
                    logger.error(
                        "job_to_candidates_item_failed",
                        parsed_resume_id=str(pr.id),
                        error=str(exc),
                    )
                    candidate_name = f"{pr.first_name or ''} {pr.last_name or ''}".strip() or "Unknown"
                    results.append(
                        MatchResultResponse(
                            job_id=request.job_id,
                            job_title=job.title,
                            candidate_id=str(pr.id),
                            candidate_name=candidate_name,
                            match_score=0,
                            reasoning=f"Match processing failed: {str(exc)}",
                        )
                    )

            results.sort(key=lambda r: r.match_score, reverse=True)

            if request.min_score and request.min_score > 0:
                results = [r for r in results if r.match_score >= request.min_score]

            results = results[: (request.top_k or 10)]

            return JobToCandidatesResponse(
                job_id=request.job_id,
                job_title=job.title,
                total_candidates_evaluated=len(parsed_resumes),
                total_matches=len(results),
                results=results,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "job_to_candidates_failed",
            error=str(e),
            job_id=request.job_id,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Job-to-candidates matching failed: {str(e)}",
        )


@router.post("/candidate-to-jobs", response_model=CandidateToJobsResponse)
async def match_candidate_to_multiple_jobs(request: CandidateToJobsRequest):
    try:
        async with async_session_maker() as session:
            structured_cv = await _get_structured_cv_by_id(
                session, request.candidate_id
            )
            candidate_name = await _get_name_by_id(
                session, request.candidate_id
            )
            if not candidate_name:
                candidate_name = (
                    (structured_cv.get("full_name") or "").strip() or None
                )

            if request.job_ids and len(request.job_ids) > 0:
                jobs = []
                for jid in request.job_ids:
                    try:
                        job = await session.get(Job, UUID(jid))
                        if job and job.description:
                            jobs.append(job)
                    except Exception:
                        logger.warning("invalid_job_id_skipped", job_id=jid)
                        continue
            else:
                jobs = await _get_all_open_jobs(
                    session, limit=(request.top_k or 10) * 5
                )

            if not jobs:
                return CandidateToJobsResponse(
                    candidate_id=request.candidate_id,
                    candidate_name=candidate_name,
                    total_jobs_evaluated=0,
                    total_matches=0,
                    results=[],
                )

            results: List[MatchResultResponse] = []

            for job in jobs:
                try:
                    ai_result = await ai_client.rag_match(
                        job_description=job.description,
                        structured_cv=structured_cv,
                    )

                    match_score = ai_result.get("match_score", 0)

                    results.append(
                        MatchResultResponse(
                            job_id=str(job.id),
                            job_title=job.title,
                            candidate_id=request.candidate_id,
                            candidate_name=candidate_name,
                            match_score=match_score,
                            reasoning=ai_result.get("reasoning", ""),
                            strengths=ai_result.get("strengths", []),
                            gaps=ai_result.get("gaps", []),
                            recommendations=ai_result.get("recommendations", []),
                        )
                    )

                except Exception as exc:
                    logger.error(
                        "candidate_to_jobs_item_failed",
                        candidate_id=request.candidate_id,
                        job_id=str(job.id),
                        error=str(exc),
                    )
                    results.append(
                        MatchResultResponse(
                            job_id=str(job.id),
                            job_title=job.title,
                            candidate_id=request.candidate_id,
                            candidate_name=candidate_name,
                            match_score=0,
                            reasoning=f"Match failed: {str(exc)}",
                        )
                    )

            results.sort(key=lambda r: r.match_score, reverse=True)

            if request.min_score and request.min_score > 0:
                results = [r for r in results if r.match_score >= request.min_score]

            top_k = request.top_k or 10
            results = results[:top_k]

            return CandidateToJobsResponse(
                candidate_id=request.candidate_id,
                candidate_name=candidate_name,
                total_jobs_evaluated=len(jobs),
                total_matches=len(results),
                results=results,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "candidate_to_jobs_failed",
            error=str(e),
            candidate_id=request.candidate_id,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Candidate-to-jobs matching failed: {str(e)}",
        )