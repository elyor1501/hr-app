from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Candidate
from src.repositories.base import BaseRepository
from src.models.enums import CandidateStatus


class CandidateRepository(BaseRepository[Candidate]):
    """Repository for Candidate operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Candidate, session)

    async def get_by_email(self, email: str) -> Optional[Candidate]:
        """Get a candidate by email."""
        stmt = select(Candidate).where(Candidate.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def semantic_search(
        self, 
        query_embedding: List[float], 
        limit: int = 10, 
        status: Optional[CandidateStatus] = None
    ) -> List[Tuple[Candidate, float]]:
        """Find candidates using vector similarity search."""
        score_col = (1 - Candidate.embedding.cosine_distance(query_embedding)).label("score")
        
        stmt = (
            select(Candidate, score_col)
            .where(Candidate.embedding.is_not(None))
            .order_by(score_col.desc())
            .limit(limit)
        )
        
        if status:
            stmt = stmt.where(Candidate.status == status)
            
        result = await self.session.execute(stmt)
        return list(result.all())