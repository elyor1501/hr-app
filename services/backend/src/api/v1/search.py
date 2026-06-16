import hashlib
import json
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.redis import get_redis_pool
from src.db.session import get_db_session
from src.db.models import Candidate, ParsedResume

logger = structlog.get_logger()
router = APIRouter()

SEARCH_CACHE_TTL = 120


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


def _parse_skills(raw) -> List[str]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _score_text_match(row_data: dict, query_words: List[str]) -> float:
    if not query_words:
        return 0.0

    skills_list = [s.lower() for s in (row_data.get("skills") or [])]
    skills_text = " ".join(skills_list)
    title_text = (row_data.get("current_title") or "").lower()
    company_text = (row_data.get("current_company") or "").lower()
    summary_text = (row_data.get("summary") or "").lower()
    location_text = (row_data.get("location") or "").lower()
    first_name = (row_data.get("first_name") or "").lower()
    last_name = (row_data.get("last_name") or "").lower()
    name_text = f"{first_name} {last_name}".strip()

    total_score = 0.0
    matched_words = 0

    for word in query_words:
        w = word.lower()
        word_score = 0.0

        if any(s == w for s in skills_list):
            word_score += 0.50
        elif any(s.startswith(w) or w in s for s in skills_list):
            word_score += 0.35
        elif w in skills_text:
            word_score += 0.20

        if w in title_text:
            word_score += 0.25

        if w in name_text:
            word_score += 0.20

        if w in company_text:
            word_score += 0.10

        if w in location_text:
            word_score += 0.10

        if w in summary_text and word_score == 0:
            word_score += 0.05

        if word_score > 0:
            matched_words += 1

        total_score += min(word_score, 1.0)

    base_score = total_score / len(query_words)
    coverage = matched_words / len(query_words)
    final = base_score * (0.5 + 0.5 * coverage)
    return round(min(final, 1.0), 4)


def _build_cache_key(request: SearchRequest) -> str:
    raw = f"{request.query_text}|{request.top_k}|{request.min_score}|{request.status}|{request.experience_level}|{request.availability}|{request.location}|{sorted(request.skills or [])}"
    return f"hr_app:search:v4:{hashlib.md5(raw.encode()).hexdigest()}"


@router.post("", response_model=SearchResponse)
async def search_candidates(
    request: SearchRequest,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        cache_key = _build_cache_key(request)

        try:
            redis = await get_redis_pool()
            cached = await redis.get(cache_key)
            if cached:
                return SearchResponse(**json.loads(cached))
        except Exception:
            pass

        query_words = [
            w.strip().lower()
            for w in request.query_text.split()
            if len(w.strip()) >= 1
        ]
        if not query_words:
            query_words = [request.query_text.strip().lower()]

        results_map = {}

        candidate_filters = []
        parsed_filters = []

        if request.experience_level:
            candidate_filters.append(
                Candidate.experience_level == request.experience_level
            )

        if request.availability:
            candidate_filters.append(
                Candidate.availability == request.availability
            )

        if request.location:
            candidate_filters.append(
                Candidate.location.ilike(f"%{request.location}%")
            )
            parsed_filters.append(
                ParsedResume.location.ilike(f"%{request.location}%")
            )

        if request.skills:
            for skill in request.skills:
                candidate_filters.append(
                    func.lower(
                        func.array_to_string(Candidate.skills, " ")
                    ).contains(skill.lower())
                )
                parsed_filters.append(
                    func.lower(
                        func.array_to_string(ParsedResume.skills, " ")
                    ).contains(skill.lower())
                )

        text_conditions_candidate = []
        text_conditions_parsed = []

        for word in query_words:
            w = f"%{word}%"
            text_conditions_candidate.extend([
                Candidate.first_name.ilike(w),
                Candidate.last_name.ilike(w),
                func.concat(
                    Candidate.first_name, " ", Candidate.last_name
                ).ilike(w),
                Candidate.current_title.ilike(w),
                Candidate.current_company.ilike(w),
                Candidate.location.ilike(w),
                Candidate.email.ilike(w),
                func.lower(
                    func.array_to_string(Candidate.skills, " ")
                ).contains(word.lower()),
            ])

            text_conditions_parsed.extend([
                ParsedResume.first_name.ilike(w),
                ParsedResume.last_name.ilike(w),
                func.concat(
                    ParsedResume.first_name, " ", ParsedResume.last_name
                ).ilike(w),
                ParsedResume.current_title.ilike(w),
                ParsedResume.current_company.ilike(w),
                ParsedResume.location.ilike(w),
                ParsedResume.summary.ilike(w),
                func.lower(
                    func.array_to_string(ParsedResume.skills, " ")
                ).contains(word.lower()),
            ])

        candidate_query = select(
            Candidate.id,
            Candidate.first_name,
            Candidate.last_name,
            Candidate.email,
            Candidate.phone,
            Candidate.current_title,
            Candidate.current_company,
            Candidate.location,
            Candidate.skills,
            Candidate.years_of_experience,
            Candidate.experience_level,
            Candidate.availability,
            Candidate.hourly_rate,
            Candidate.status,
        ).where(or_(*text_conditions_candidate))

        if candidate_filters:
            candidate_query = candidate_query.where(and_(*candidate_filters))
        if request.status:
            candidate_query = candidate_query.where(
                Candidate.status == request.status
            )
        candidate_query = candidate_query.limit(request.top_k * 5)

        parsed_query = select(
            ParsedResume.id,
            ParsedResume.resume_id,
            ParsedResume.first_name,
            ParsedResume.last_name,
            ParsedResume.email,
            ParsedResume.phone,
            ParsedResume.current_title,
            ParsedResume.current_company,
            ParsedResume.location,
            ParsedResume.skills,
            ParsedResume.years_of_experience,
            ParsedResume.summary,
            ParsedResume.json_data,
            ParsedResume.candidate_status,
        ).where(or_(*text_conditions_parsed))

        if parsed_filters:
            parsed_query = parsed_query.where(and_(*parsed_filters))
        if request.status:
            parsed_query = parsed_query.where(
                ParsedResume.candidate_status == request.status
            )
        parsed_query = parsed_query.limit(request.top_k * 5)

        candidate_result = await session.execute(candidate_query)
        candidates = candidate_result.mappings().all()

        parsed_result = await session.execute(parsed_query)
        parsed_resumes = parsed_result.mappings().all()

        for c in candidates:
            cid = str(c["id"])
            skills = _parse_skills(c["skills"])
            row_data = {
                "first_name": c["first_name"],
                "last_name": c["last_name"],
                "current_title": c["current_title"],
                "current_company": c["current_company"],
                "location": c["location"],
                "skills": skills,
                "summary": "",
            }
            score = _score_text_match(row_data, query_words)
            results_map[cid] = {
                "id": cid,
                "resume_id": None,
                "first_name": c["first_name"],
                "last_name": c["last_name"],
                "email": c["email"],
                "phone": c["phone"],
                "skills": skills,
                "current_title": c["current_title"],
                "current_company": c["current_company"],
                "location": c["location"],
                "years_of_experience": c["years_of_experience"],
                "summary": None,
                "experience_level": c["experience_level"],
                "availability": c["availability"],
                "hourly_rate": float(c["hourly_rate"]) if c["hourly_rate"] else None,
                "candidate_status": c["status"],
                "score": score,
            }

        seen_emails = {
            (v.get("email") or "").strip().lower()
            for v in results_map.values()
            if v.get("email")
        }
        seen_names = {
            (
                (v.get("first_name") or "").strip().lower(),
                (v.get("last_name") or "").strip().lower(),
            )
            for v in results_map.values()
            if v.get("first_name") and v.get("last_name")
        }

        for pr in parsed_resumes:
            pr_email = (pr["email"] or "").strip().lower()
            pr_first = (pr["first_name"] or "").strip().lower()
            pr_last = (pr["last_name"] or "").strip().lower()

            if pr_email and pr_email in seen_emails:
                continue
            if pr_first and pr_last and (pr_first, pr_last) in seen_names:
                continue

            pid = str(pr["id"])
            jd = pr["json_data"] or {}
            skills = _parse_skills(pr["skills"]) or _parse_skills(
                jd.get("skills")
            )
            title = pr["current_title"] or jd.get("current_title")
            company = pr["current_company"] or jd.get("current_company")
            location = pr["location"] or jd.get("location")
            summary = pr["summary"] or jd.get("summary") or ""

            row_data = {
                "first_name": pr["first_name"],
                "last_name": pr["last_name"],
                "current_title": title,
                "current_company": company,
                "location": location,
                "skills": skills,
                "summary": summary,
            }
            score = _score_text_match(row_data, query_words)

            results_map[pid] = {
                "id": pid,
                "resume_id": str(pr["resume_id"]) if pr["resume_id"] else None,
                "first_name": pr["first_name"],
                "last_name": pr["last_name"],
                "email": pr["email"] or jd.get("email"),
                "phone": pr["phone"] or jd.get("phone"),
                "skills": skills,
                "current_title": title,
                "current_company": company,
                "location": location,
                "years_of_experience": pr["years_of_experience"],
                "summary": summary,
                "experience_level": None,
                "availability": None,
                "hourly_rate": None,
                "candidate_status": pr["candidate_status"],
                "score": score,
            }

            if pr_email:
                seen_emails.add(pr_email)
            if pr_first and pr_last:
                seen_names.add((pr_first, pr_last))

        results = [CandidateResult(**data) for data in results_map.values()]
        results.sort(key=lambda x: x.score, reverse=True)
        results = results[:request.top_k]

        response = SearchResponse(
            query=request.query_text,
            total=len(results),
            candidates=results,
        )

        try:
            redis = await get_redis_pool()
            await redis.setex(
                cache_key,
                SEARCH_CACHE_TTL,
                json.dumps(response.model_dump(), default=str),
            )
        except Exception:
            pass

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("search_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")