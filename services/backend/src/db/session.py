import uuid
from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import structlog
from src.core.config import settings

logger = structlog.get_logger()

def get_unique_stmt_name():
    return f"__asyncpg_stmt_{uuid.uuid4().hex}__"

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=False,
    pool_recycle=3600,
    echo=False,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": get_unique_stmt_name,
        "command_timeout": 60,
        "server_settings": {
            "application_name": "hr-app-backend",
            "jit": "off"
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
        finally:
            await session.close()

async def init_db_connection() -> None:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("Database connection initialized")
    except Exception as e:
        logger.error("Failed to initialize database connection", error=str(e))
        raise

async def close_db_connection() -> None:
    await engine.dispose()
    logger.info("Database connection closed")

async def check_db_connection() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False