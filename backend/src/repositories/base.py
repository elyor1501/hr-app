# D:\hr-app\services\backend\src\repositories\base.py

from typing import Any, Generic, TypeVar
from uuid import UUID

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.base import Base

logger = structlog.get_logger()

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with generic CRUD operations.
    All repositories should inherit from this class.
    """

    def __init__(self, model: type[ModelType], session: AsyncSession) -> None:
        """
        Initialize repository with model class and database session.
        
        Args:
            model: SQLAlchemy model class
            session: Async database session
        """
        self.model = model
        self.session = session

    async def create(self, **kwargs: Any) -> ModelType:
        """
        Create a new record.
        
        Args:
            **kwargs: Model field values
            
        Returns:
            Created model instance
        """
        try:
            instance = self.model(**kwargs)
            self.session.add(instance)
            await self.session.commit()
            await self.session.refresh(instance)
            logger.info(
                "Record created",
                model=self.model.__name__,
                id=getattr(instance, "id", None),
            )
            return instance
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(
                "Failed to create record",
                model=self.model.__name__,
                error=str(e),
            )
            raise

    async def get_by_id(self, record_id: UUID | int) -> ModelType | None:
        """
        Get a record by ID.
        
        Args:
            record_id: Record primary key
            
        Returns:
            Model instance or None if not found
        """
        try:
            result = await self.session.execute(
                select(self.model).where(self.model.id == record_id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                "Failed to get record",
                model=self.model.__name__,
                id=str(record_id),
                error=str(e),
            )
            raise

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ModelType]:
        """
        Get all records with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of model instances
        """
        try:
            result = await self.session.execute(
                select(self.model).offset(skip).limit(limit)
            )
            return list(result.scalars().all())
        except SQLAlchemyError as e:
            logger.error(
                "Failed to get records",
                model=self.model.__name__,
                error=str(e),
            )
            raise

    async def update(
        self,
        record_id: UUID | int,
        **kwargs: Any,
    ) -> ModelType | None:
        """
        Update a record by ID.
        
        Args:
            record_id: Record primary key
            **kwargs: Fields to update
            
        Returns:
            Updated model instance or None if not found
        """
        try:
            await self.session.execute(
                update(self.model)
                .where(self.model.id == record_id)
                .values(**kwargs)
            )
            await self.session.commit()
            
            # Fetch updated record
            instance = await self.get_by_id(record_id)
            if instance:
                logger.info(
                    "Record updated",
                    model=self.model.__name__,
                    id=str(record_id),
                )
            return instance
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(
                "Failed to update record",
                model=self.model.__name__,
                id=str(record_id),
                error=str(e),
            )
            raise

    async def delete(self, record_id: UUID | int) -> bool:
        """
        Delete a record by ID.
        
        Args:
            record_id: Record primary key
            
        Returns:
            True if deleted, False if not found
        """
        try:
            result = await self.session.execute(
                delete(self.model).where(self.model.id == record_id)
            )
            await self.session.commit()
            deleted = result.rowcount > 0
            if deleted:
                logger.info(
                    "Record deleted",
                    model=self.model.__name__,
                    id=str(record_id),
                )
            return deleted
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(
                "Failed to delete record",
                model=self.model.__name__,
                id=str(record_id),
                error=str(e),
            )
            raise

    async def exists(self, record_id: UUID | int) -> bool:
        """
        Check if a record exists.
        
        Args:
            record_id: Record primary key
            
        Returns:
            True if exists, False otherwise
        """
        result = await self.get_by_id(record_id)
        return result is not None