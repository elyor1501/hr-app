from typing import List, Optional, Tuple, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Candidate, Resume
from src.models.enums import CandidateStatus
from src.repositories.base import BaseRepository

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

class CandidateRepository(BaseRepository[Candidate]):
    def __init__(self, session: AsyncSession):
        super().__init__(Candidate, session)

    async def get_by_email(self, email: str) -> Optional[Candidate]:
        result = await self.session.execute(
            select(Candidate).where(Candidate.email == email)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100, status: Optional[CandidateStatus] = None) -> List[Candidate]:
        query = select(*CANDIDATE_LIST_COLUMNS)
        if status:
            status_val = status.value if hasattr(status, "value") else status
            query = query.where(Candidate.status == status_val)
        query = (
            query
            .order_by(Candidate.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.mappings().all())

    async def semantic_search(self, query_embedding: List[float], limit: int = 10, status: Optional[CandidateStatus] = None) -> List[Tuple[Candidate, float]]:
        distance = Candidate.embedding.cosine_distance(query_embedding)
        similarity = (1 - distance).label("similarity_score")
        query = (
            select(Candidate, similarity)
            .where(Candidate.embedding.is_not(None))
            .order_by(distance)
            .limit(limit)
        )
        if status:
            status_val = status.value if hasattr(status, "value") else status
            query = query.where(Candidate.status == status_val)
        result = await self.session.execute(query)
        return list(result.all())

class ResumeRepository(BaseRepository[Resume]):
    def __init__(self, session: AsyncSession):
        super().__init__(Resume, session)

    async def semantic_search(self, query_embedding: List[float], limit: int = 10) -> List[Tuple[Resume, float]]:
        distance = Resume.embedding.cosine_distance(query_embedding)
        similarity = (1 - distance).label("similarity_score")
        query = (
            select(Resume, similarity)
            .where(Resume.embedding.is_not(None))
            .order_by(distance)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.all())