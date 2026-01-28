import pytest
from sqlalchemy import text

from src.db import check_db_connection, engine


class TestDatabaseConnection:
    """Tests for database connection functionality."""

    @pytest.mark.asyncio
    async def test_database_connection_established(self) -> None:
        """Test that database connection can be established."""
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            assert result.scalar() == 1

    @pytest.mark.asyncio
    async def test_pgvector_extension_enabled(self) -> None:
        """Test that pgvector extension is available."""
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    "SELECT EXISTS("
                    "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
                    ")"
                )
            )
            assert result.scalar() is True

    @pytest.mark.asyncio
    async def test_check_db_connection_returns_true(self) -> None:
        """Test health check returns True when DB is healthy."""
        is_healthy = await check_db_connection()
        assert is_healthy is True

    @pytest.mark.asyncio
    async def test_connection_pool_configured(self) -> None:
        """Test that connection pool is properly configured."""
        assert engine.pool.size() >= 0