from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
import structlog

from src.core.config import settings

logger = structlog.get_logger()

# Create async engine with connection pool
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_pre_ping=True,
    echo=settings.environment == "development",
)

# Create async session factory
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions.
    """
    session = async_session_maker()
    try:
        yield session
    except SQLAlchemyError as e:
        await session.rollback()
        logger.error("Database session error", error=str(e))
        raise
    finally:
        await session.close()


async def init_db_connection() -> None:
    """
    Initialize database connection pool and enable pgvector extension.
    Called on application startup.
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("pgvector extension enabled")

        logger.info(
            "Database connection pool established",
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
        )
    except Exception as e:
        logger.error("Failed to initialize database connection", error=str(e))
        raise


async def close_db_connection() -> None:
    """
    Close database connection pool.
    Called on application shutdown.
    """
    try:
        await engine.dispose()
        logger.info("Database connection pool closed")
    except Exception as e:
        logger.error("Error closing database connection", error=str(e))
        raise


async def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False