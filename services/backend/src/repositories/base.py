from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import delete, inspect, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.db.base import Base

logger = structlog.get_logger()

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with generic CRUD operations.
    Includes column filtering to prevent schema/model mismatches.
    """

    def __init__(
        self, model: type[ModelType], session: AsyncSession
    ) -> None:
        self.model = model
        self.session = session

    def _filter_and_convert(
        self, data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        1. Drop keys not matching ORM columns.
        2. Convert enums to .value strings.
        3. Convert Decimal to float.
        """
        valid_keys = {
            c.key
            for c in inspect(self.model).mapper.column_attrs
        }
        filtered = {}
        for key, value in data.items():
            if key not in valid_keys:
                logger.debug(
                    "Skipping non-column field",
                    field=key,
                    model=self.model.__name__,
                )
                continue
            if hasattr(value, "value"):
                filtered[key] = value.value
            elif hasattr(value, "as_tuple"):
                filtered[key] = float(value)
            else:
                filtered[key] = value
        return filtered

    async def create(self, **kwargs: Any) -> ModelType:
        """Create a new record."""
        try:
            cleaned = self._filter_and_convert(kwargs)
            instance = self.model(**cleaned)
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

    async def get_by_id(
        self, record_id: UUID | int
    ) -> ModelType | None:
        """Get a record by ID."""
        try:
            result = await self.session.execute(
                select(self.model).where(
                    self.model.id == record_id
                )
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
        """Get all records with pagination."""
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
        """Update a record by ID."""
        try:
            cleaned = self._filter_and_convert(kwargs)
            if not cleaned:
                return await self.get_by_id(record_id)

            await self.session.execute(
                update(self.model)
                .where(self.model.id == record_id)
                .values(**cleaned)
            )
            await self.session.commit()
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
        """Delete a record by ID."""
        try:
            result = await self.session.execute(
                delete(self.model).where(
                    self.model.id == record_id
                )
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
        """Check if a record exists."""
        result = await self.get_by_id(record_id)
        return result is not None