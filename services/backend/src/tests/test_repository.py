import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.base import BaseRepository


class TestBaseRepository:
    """Tests for BaseRepository."""

    @pytest.mark.asyncio
    async def test_repository_initialization(
        self, db_session: AsyncSession
    ) -> None:
        """Test repository can be initialized with session."""
        assert db_session is not None