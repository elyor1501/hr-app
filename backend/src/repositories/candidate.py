from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Candidate
from src.repositories.base import BaseRepository


class CandidateRepository(BaseRepository[Candidate]):
    """Repository for Candidate operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Candidate, session)

    async def get_by_email(self, email: str) -> Optional[Candidate]:
        """Get a candidate by email."""
        stmt = select(Candidate).where(Candidate.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()