import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from sqlalchemy.exc import SQLAlchemyError

from src.repositories.base import BaseRepository
from src.db.models import Job


# ==========================================
# TEST DATABASE ERROR HANDLERS IN BASE.PY
# ==========================================

@pytest.mark.asyncio
async def test_base_repo_create_error(db_session):
    """Test error handling during create (hits lines 43-50)."""
    repo = BaseRepository(Job, db_session)
    
    with patch.object(db_session, 'commit', new_callable=AsyncMock, side_effect=SQLAlchemyError("DB Error")):
        with patch.object(db_session, 'rollback', new_callable=AsyncMock) as mock_rollback:
            with pytest.raises(SQLAlchemyError):
                await repo.create(
                    title="Error Test",
                    description="Testing error handling",
                    status="OPEN",
                    salary_currency="USD"
                )
            mock_rollback.assert_called_once()


@pytest.mark.asyncio
async def test_base_repo_get_by_id_error(db_session):
    """Test error handling during get_by_id (hits lines 61-68)."""
    repo = BaseRepository(Job, db_session)
    
    with patch.object(db_session, 'execute', new_callable=AsyncMock, side_effect=SQLAlchemyError("DB Error")):
        with pytest.raises(SQLAlchemyError):
            await repo.get_by_id(uuid4())


@pytest.mark.asyncio
async def test_base_repo_get_all_error(db_session):
    """Test error handling during get_all (hits lines 82-89)."""
    repo = BaseRepository(Job, db_session)
    
    with patch.object(db_session, 'execute', new_callable=AsyncMock, side_effect=SQLAlchemyError("DB Error")):
        with pytest.raises(SQLAlchemyError):
            await repo.get_all()


@pytest.mark.asyncio
async def test_base_repo_update_error(db_session):
    """Test error handling during update (hits lines 114-122)."""
    repo = BaseRepository(Job, db_session)
    
    # Mock execute to raise error (this is called during update)
    with patch.object(db_session, 'execute', new_callable=AsyncMock, side_effect=SQLAlchemyError("DB Error")):
        with patch.object(db_session, 'rollback', new_callable=AsyncMock) as mock_rollback:
            with pytest.raises(SQLAlchemyError):
                await repo.update(uuid4(), title="New Title")
            mock_rollback.assert_called_once()


@pytest.mark.asyncio
async def test_base_repo_delete_error(db_session):
    """Test error handling during delete (hits lines 141-149)."""
    repo = BaseRepository(Job, db_session)
    
    with patch.object(db_session, 'execute', new_callable=AsyncMock, side_effect=SQLAlchemyError("DB Error")):
        with patch.object(db_session, 'rollback', new_callable=AsyncMock) as mock_rollback:
            with pytest.raises(SQLAlchemyError):
                await repo.delete(uuid4())
            mock_rollback.assert_called_once()