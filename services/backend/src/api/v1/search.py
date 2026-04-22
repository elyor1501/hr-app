import hashlib
import json
from typing import List, Optional

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func, text, and_

from src.core.redis import get_redis_pool
from src.db.session import async_session_maker
from src.db.models import Candidate, ParsedResume
from src.services.ai_client import AIClient

logger = structlog.get_logger()
router = APIRouter()
ai_client = AIClient()

SEARCH_CACHE_TTL = 60


class SearchRequest(BaseModel):
    query_text: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)
    status: Optional[str] = Field(default=None, pattern="^(active|inactive)$")
    experience_level: Optional[str] = Field(default=None)
    availability: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    skills: Optional[List[str]] = Field(default=None)


class CandidateResult(BaseModel):
    id: str
    resume_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None
    years_of_experience: Optional[int] = None
    summary: Optional[str] = None
    experience_level: Optional[str] = None
    availability: Optional[str] = None
    hourly_rate: Optional[float] = None
    candidate_status: str = "active"
    score: float


class SearchResponse(BaseModel):
    query: str
    total: int
    candidates: List[CandidateResult]


def _parse_skills(raw) -> Optional[List[str]]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            import json as _json
            parsed = _json.loads(raw)
            return parsed if isinstance(parsed, list) else None
        except Exception:
            return None
    return None


def _score_text_match(row_data: dict, query_words: List[str]) -> float:
    skills_text = " ".join(row_data.get("skills") or []).lower()
    title_text = (row_data.get("current_title") or "").lower()
    company_text = (row_data.get("current_company") or "").lower()
    summary_text = (row_data.get("summary") or "").lower()
    location_text = (row_data.get("location") or "").lower()
    name_text = f"{row_data.get('first_name') or ''} {row_data.get('last_name') or ''}".lower()

    total = 0.0
    for word in query_words:
        w = word.lower()
        if w in skills_text:
            total += 0.30
        if w in title_text:
            total += 0.20
        if w in name_text:
            total += 0.15
        if w in company_text:
            total += 0.10
        if w in summary_text:
            total += 0.15
        if w in location_text:
            total += 0.10

    max_possible = len(query_words) * 1.0
    return min(total / max_possible, 1.0) if max_possible > 0 else 0.0


def _build_cache_key(request: SearchRequest) -> str:
    raw = f"{request.query_text}|{request.top_k}|{request.min_score}|{request.status}|{request.experience_level}|{request.availability}|{request.location}|{sorted(request.skills or [])}"
    return f"hr_app:search:v2:{hashlib.md5(raw.encode()).hexdigest()}"


@router.post("", response_model=SearchResponse)
async def search_candidates(request: SearchRequest):
    try:
        cache_key = _build_cache_key(request)

        try:
            redis = await get_redis_pool()
            cached = await redis.get(cache_key)
            if cached:
                return SearchResponse(**json.loads(cached))
        except Exception:
            pass

        query_words = [w.strip().lower() for w in request.query_text.split() if len(w.strip()) >= 2]
        if not query_words:
            query_words = [request.query_text.strip().lower()]

        results_map = {}

        async with async_session_maker() as session:
            candidate_filters = []
            parsed_filters = []

            if request.experience_level:
                candidate_filters.append(Candidate.experience_level == request.experience_level)

            if request.availability:
                candidate_filters.append(Candidate.availability == request.availability)

            if request.location:
                candidate_filters.append(Candidate.location.ilike(f"%{request.location}%"))
                parsed_filters.append(ParsedResume.location.ilike(f"%{request.location}%"))

            if request.skills:
                for skill in request.skills:
                    candidate_filters.append(
                        func.lower(func.array_to_string(Candidate.skills, ' ')).contains(skill.lower())
                    )
                    parsed_filters.append(
                        func.lower(func.array_to_string(ParsedResume.skills, ' ')).contains(skill.lower())
                    )

            text_conditions_candidate = []
            text_conditions_parsed = []
            for word in query_words:
                w = f"%{word}%"
                text_conditions_candidate.append(Candidate.first_name.ilike(w))
                text_conditions_candidate.append(Candidate.last_name.ilike(w))
                text_conditions_candidate.append(Candidate.current_title.ilike(w))
                text_conditions_candidate.append(Candidate.location.ilike(w))
                text_conditions_candidate.append(Candidate.email.ilike(w))

                text_conditions_parsed.append(ParsedResume.first_name.ilike(w))
                text_conditions_parsed.append(ParsedResume.last_name.ilike(w))
                text_conditions_parsed.append(ParsedResume.current_title.ilike(w))
                text_conditions_parsed.append(ParsedResume.location.ilike(w))
                text_conditions_parsed.append(ParsedResume.summary.ilike(w))

            candidate_query = select(Candidate).where(or_(*text_conditions_candidate))
            if candidate_filters:
                candidate_query = candidate_query.where(and_(*candidate_filters))
            if request.status:
                candidate_query = candidate_query.where(Candidate.status == request.status)
            candidate_query = candidate_query.limit(request.top_k * 3)

            parsed_query = select(ParsedResume).where(or_(*text_conditions_parsed))
            if parsed_filters:
                parsed_query = parsed_query.where(and_(*parsed_filters))
            if request.status:
                parsed_query = parsed_query.where(ParsedResume.candidate_status == request.status)
            parsed_query = parsed_query.limit(request.top_k * 3)

            candidate_result = await session.execute(candidate_query)
            candidates = candidate_result.scalars().all()

            parsed_result = await session.execute(parsed_query)
            parsed_resumes = parsed_result.scalars().all()

            for c in candidates:
                cid = str(c.id)
                row_data = {
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "current_title": c.current_title,
                    "current_company": c.current_company,
                    "location": c.location,
                    "skills": c.skills or [],
                    "summary": c.resume_text,
                }
                score = _score_text_match(row_data, query_words)
                results_map[cid] = {
                    "id": cid,
                    "resume_id": None,
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "email": c.email,
                    "phone": c.phone,
                    "skills": c.skills,
                    "current_title": c.current_title,
                    "current_company": c.current_company,
                    "location": c.location,
                    "years_of_experience": c.years_of_experience,
                    "summary": c.resume_text,
                    "experience_level": c.experience_level,
                    "availability": c.availability,
                    "hourly_rate": float(c.hourly_rate) if c.hourly_rate else None,
                    "candidate_status": c.status,
                    "score": score,
                }

            for pr in parsed_resumes:
                pid = str(pr.id)
                if pid in results_map:
                    continue
                jd = pr.json_data or {}
                row_data = {
                    "first_name": pr.first_name,
                    "last_name": pr.last_name,
                    "current_title": pr.current_title or jd.get("current_title"),
                    "current_company": pr.current_company or jd.get("current_company"),
                    "location": pr.location or jd.get("location"),
                    "skills": _parse_skills(pr.skills) or _parse_skills(jd.get("skills")) or [],
                    "summary": pr.summary or jd.get("summary"),
                }
                score = _score_text_match(row_data, query_words)
                results_map[pid] = {
                    "id": pid,
                    "resume_id": str(pr.resume_id) if pr.resume_id else None,
                    "first_name": pr.first_name,
                    "last_name": pr.last_name,
                    "email": pr.email or jd.get("email"),
                    "phone": pr.phone or jd.get("phone"),
                    "skills": row_data["skills"],
                    "current_title": row_data["current_title"],
                    "current_company": row_data["current_company"],
                    "location": row_data["location"],
                    "years_of_experience": pr.years_of_experience,
                    "summary": row_data["summary"],
                    "experience_level": None,
                    "availability": None,
                    "hourly_rate": None,
                    "candidate_status": pr.candidate_status,
                    "score": score,
                }

        results = []
        for data in results_map.values():
            if data["score"] < request.min_score:
                continue
            results.append(CandidateResult(**data))

        results.sort(key=lambda x: x.score, reverse=True)
        results = results[:request.top_k]

        response = SearchResponse(
            query=request.query_text,
            total=len(results),
            candidates=results,
        )

        try:
            redis = await get_redis_pool()
            await redis.setex(cache_key, SEARCH_CACHE_TTL, json.dumps(response.model_dump(), default=str))
        except Exception:
            pass

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("search_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")