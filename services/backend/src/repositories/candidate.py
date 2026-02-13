from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Candidate
from src.models.enums import CandidateStatus
from src.repositories.base import BaseRepository


class CandidateRepository(BaseRepository[Candidate]):
    """Repository for Candidate operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Candidate, session)

    async def get_by_email(
        self, email: str
    ) -> Optional[Candidate]:
        result = await self.session.execute(
            select(Candidate).where(Candidate.email == email)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[CandidateStatus] = None,
    ) -> List[Candidate]:
        query = select(Candidate)
        if status:
            status_val = (
                status.value
                if hasattr(status, "value")
                else status
            )
            query = query.where(
                Candidate.status == status_val
            )
        query = (
            query.offset(skip)
            .limit(limit)
            .order_by(Candidate.created_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def semantic_search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        status: Optional[CandidateStatus] = None,
    ) -> List[Tuple[Candidate, float]]:
        """Vector similarity search using cosine distance."""
        distance = Candidate.embedding.cosine_distance(
            query_embedding
        )
        similarity = (1 - distance).label("similarity_score")

        query = (
            select(Candidate, similarity)
            .where(Candidate.embedding.is_not(None))
            .order_by(distance)
            .limit(limit)
        )

        if status:
            status_val = (
                status.value
                if hasattr(status, "value")
                else status
            )
            query = query.where(
                Candidate.status == status_val
            )

        result = await self.session.execute(query)
        return list(result.all())