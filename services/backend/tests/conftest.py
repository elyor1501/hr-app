import asyncio
from collections.abc import AsyncGenerator, Generator

from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import Settings
from src.db.base import Base
from src.db.session import get_db_session
from src.main import create_app


def get_test_settings() -> Settings:
    """Get settings configured for testing."""
    return Settings(
        database_name="hr_app_test",
        environment="testing",
    )


test_settings = get_test_settings()

test_engine = create_async_engine(
    test_settings.database_url,
    pool_pre_ping=True,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test client for the FastAPI app.
    
    IMPORTANT: This fixture now depends on db_session and overrides
    the get_db_session dependency to use our test database session.
    This ensures all API calls use the test database.
    """
    app = create_app()

    # Override the database session dependency to use our test session
    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # Clean up dependency overrides
    app.dependency_overrides.clear()