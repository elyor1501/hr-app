import asyncio
import uuid
import os
from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import structlog

logger = structlog.get_logger()


def get_unique_stmt_name():
    return f"__asyncpg_stmt_{uuid.uuid4().hex}__"


def get_database_url_direct():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        logger.info("using_database_url_from_env")
        return db_url
    
    from src.core.config import settings
    url = settings.get_database_url()
    logger.info("using_database_url_from_settings")
    return url


engine = create_async_engine(
    get_database_url_direct(),
    pool_size=20,
    max_overflow=30,
    pool_timeout=10,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": get_unique_stmt_name,
        "command_timeout": 30,
        "server_settings": {
            "application_name": "hr-app-backend",
            "jit": "off",
            "statement_timeout": "30000"
        }
    },
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError:
            await session.rollback()
            raise


async def _warm_single_connection() -> None:
    async with async_session_maker() as session:
        await session.execute(text("SELECT 1"))


async def warm_db_pool() -> None:
    logger.info("warming_database_pool")
    tasks = []
    for _ in range(5):
        tasks.append(_warm_single_connection())
    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("database_pool_warmed")


async def init_db_connection() -> None:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await warm_db_pool()
        logger.info("database_connection_initialized")
    except Exception as e:
        logger.error("database_init_failed", error=str(e))
        raise


async def close_db_connection() -> None:
    await engine.dispose()
    logger.info("database_connection_closed")


async def check_db_connection() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error("database_health_check_failed", error=str(e))
        return False