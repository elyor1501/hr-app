from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import User
from src.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(
        self, email: str
    ) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()