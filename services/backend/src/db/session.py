import uuid
from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
import structlog
from src.core.config import settings

logger = structlog.get_logger()

def get_unique_stmt_name():
    return f"__asyncpg_stmt_{uuid.uuid4().hex}__"

engine = create_async_engine(
    settings.database_url,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": get_unique_stmt_name,
    },
)

async_session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    session = async_session_maker()
    try:
        yield session
    except SQLAlchemyError as e:
        await session.rollback()
        raise
    finally:
        await session.close()

async def init_db_connection() -> None:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        raise

async def close_db_connection() -> None:
    await engine.dispose()

async def check_db_connection() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return True
    except Exception:
        return False