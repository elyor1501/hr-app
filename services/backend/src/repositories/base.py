from typing import Any, Generic, List, Optional, Type, TypeVar, Dict
from uuid import UUID
from sqlalchemy import delete, inspect, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
from src.db.base import Base

logger = structlog.get_logger()
ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: type[ModelType], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    def _filter_and_convert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        valid_keys = {c.key for c in inspect(self.model).mapper.column_attrs}
        filtered = {}
        for key, value in data.items():
            if key not in valid_keys:
                continue
            if hasattr(value, "value"):
                filtered[key] = value.value
            elif hasattr(value, "as_tuple"):
                filtered[key] = float(value)
            else:
                filtered[key] = value
        return filtered

    async def create(self, **kwargs: Any) -> ModelType:
        try:
            cleaned = self._filter_and_convert(kwargs)
            instance = self.model(**cleaned)
            self.session.add(instance)
            await self.session.commit()
            await self.session.refresh(instance)
            return instance
        except SQLAlchemyError:
            await self.session.rollback()
            raise

    async def get_by_id(self, record_id: UUID | int) -> Optional[ModelType]:
        result = await self.session.execute(
            select(self.model).where(self.model.id == record_id)
        )
        return result.scalar_one_or_none()

    async def get_by_field(self, field_name: str, value: Any) -> Optional[ModelType]:
        attr = getattr(self.model, field_name)
        result = await self.session.execute(
            select(self.model).where(attr == value)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await self.session.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, record_id: UUID | int, **kwargs: Any) -> Optional[ModelType]:
        cleaned = self._filter_and_convert(kwargs)
        if not cleaned:
            return await self.get_by_id(record_id)
        await self.session.execute(
            update(self.model).where(self.model.id == record_id).values(**cleaned)
        )
        await self.session.commit()
        return await self.get_by_id(record_id)

    async def delete(self, record_id: UUID | int) -> bool:
        result = await self.session.execute(
            delete(self.model).where(self.model.id == record_id)
        )
        await self.session.commit()
        return result.rowcount > 0

    async def exists(self, record_id: UUID | int) -> bool:
        result = await self.get_by_id(record_id)
        return result is not None