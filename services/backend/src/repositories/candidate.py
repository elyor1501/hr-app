from typing import List, Optional, Tuple, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Candidate, Resume
from src.models.enums import CandidateStatus
from src.repositories.base import BaseRepository

class CandidateRepository(BaseRepository[Candidate]):
    def __init__(self, session: AsyncSession):
        super().__init__(Candidate, session)

    async def get_by_email(self, email: str) -> Optional[Candidate]:
        result = await self.session.execute(
            select(Candidate).where(Candidate.email == email)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100, status: Optional[CandidateStatus] = None) -> List[Candidate]:
        query = select(Candidate)
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
        return list(result.scalars().all())

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