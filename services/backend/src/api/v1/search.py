import json
from typing import List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text, select, or_, cast, Text, func

from src.db.session import async_session_maker
from src.db.models import ParsedResume
from src.services.ai_client import AIClient

logger = structlog.get_logger()
router = APIRouter()
ai_client = AIClient()


class SearchRequest(BaseModel):
    query_text: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)


class CandidateResult(BaseModel):
    id: str
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
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else None
        except Exception:
            return None
    return None


def _calc_years(experience: list) -> Optional[int]:
    if not isinstance(experience, list) or not experience:
        return None
    import datetime
    total = 0
    cy = datetime.datetime.utcnow().year
    for exp in experience:
        if not isinstance(exp, dict):
            continue
        s = exp.get("start_date")
        e = exp.get("end_date")
        try:
            if s and isinstance(s, str) and len(s) >= 4:
                sy = int(s[:4])
                if e and isinstance(e, str) and e.lower() != "present" and len(e) >= 4:
                    ey = int(e[:4])
                else:
                    ey = cy
                total += (ey - sy) * 12
        except Exception:
            continue
    return total // 12 if total > 0 else None


def _score_text_match(pr, query_words):
    skills_text = " ".join(pr.skills or []).lower()
    title_text = (pr.current_title or "").lower()
    company_text = (pr.current_company or "").lower()
    summary_text = (pr.summary or "").lower()
    json_text = str(pr.json_data or {}).lower()
    education_text = str(pr.education or []).lower()
    experience_text = str(pr.experience or []).lower()
    certs_text = str(pr.certifications or []).lower()

    total = 0.0
    for word in query_words:
        w = word.lower()
        if w in skills_text:
            total += 0.30
        if w in title_text:
            total += 0.20
        if w in company_text:
            total += 0.10
        if w in summary_text:
            total += 0.15
        if w in experience_text:
            total += 0.10
        if w in education_text:
            total += 0.05
        if w in certs_text:
            total += 0.05
        if w in json_text:
            total += 0.05

    max_possible = len(query_words) * 1.0
    return min(total / max_possible, 1.0) if max_possible > 0 else 0.0


@router.post("", response_model=SearchResponse)
async def search_candidates(request: SearchRequest):
    try:
        results_map = {}
        query_words = [w.strip() for w in request.query_text.split() if len(w.strip()) >= 2]
        if not query_words:
            query_words = [request.query_text.strip()]

        async with async_session_maker() as session:

            conditions = []
            for word in query_words:
                pattern = f"%{word}%"
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
                    func.coalesce(ParsedResume.first_name, '').ilike(pattern)
                )
                conditions.append(
                    func.coalesce(ParsedResume.last_name, '').ilike(pattern)
                )
                conditions.append(
                    func.coalesce(ParsedResume.location, '').ilike(pattern)
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
                conditions.append(
                    func.coalesce(cast(ParsedResume.certifications, Text), '').ilike(pattern)
                )
                conditions.append(
                    func.coalesce(cast(ParsedResume.projects, Text), '').ilike(pattern)
                )

            if conditions:
                text_query = (
                    select(ParsedResume)
                    .where(or_(*conditions))
                    .limit(request.top_k * 3)
                )
                text_result = await session.execute(text_query)
                parsed_resumes = text_result.scalars().all()

                for pr in parsed_resumes:
                    rid = str(pr.id)
                    t_score = _score_text_match(pr, query_words)

                    jd = pr.json_data or {}
                    if not isinstance(jd, dict):
                        jd = {}

                    skills = _parse_skills(pr.skills) or _parse_skills(jd.get("skills"))

                    experience = pr.experience or jd.get("experience", [])
                    yoe = pr.years_of_experience
                    if yoe is None:
                        yoe = _calc_years(experience if isinstance(experience, list) else [])

                    results_map[rid] = {
                        "id": rid,
                        "first_name": pr.first_name,
                        "last_name": pr.last_name,
                        "email": pr.email or jd.get("email"),
                        "phone": pr.phone or jd.get("phone"),
                        "skills": skills,
                        "current_title": pr.current_title or jd.get("current_title"),
                        "current_company": pr.current_company or jd.get("current_company"),
                        "location": pr.location or jd.get("location"),
                        "years_of_experience": yoe,
                        "summary": pr.summary or jd.get("summary"),
                        "score": t_score,
                    }

        results = []
        for rid, data in results_map.items():
            if data["score"] < request.min_score:
                continue

            results.append(
                CandidateResult(
                    id=data["id"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    email=data["email"],
                    phone=data["phone"],
                    skills=data["skills"],
                    current_title=data["current_title"],
                    current_company=data["current_company"],
                    location=data["location"],
                    years_of_experience=data["years_of_experience"],
                    summary=data["summary"],
                    score=round(data["score"], 4),
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        results = results[:request.top_k]

        return SearchResponse(
            query=request.query_text,
            total=len(results),
            candidates=results,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("search_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")