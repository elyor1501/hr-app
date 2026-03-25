from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Job
from src.models.enums import JobStatus
from src.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    """Repository for Job operations with soft delete."""

    def __init__(self, session: AsyncSession):
        super().__init__(Job, session)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[JobStatus] = None,
    ) -> List[Job]:
        stmt = select(Job).where(Job.deleted_at.is_(None))

        if status:
            status_val = (
                status.value
                if hasattr(status, "value")
                else status
            )
            stmt = stmt.where(Job.status == status_val)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                (Job.title.ilike(pattern))
                | (Job.description.ilike(pattern))
            )

        stmt = (
            stmt.offset(skip)
            .limit(limit)
            .order_by(Job.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(
        self, record_id: UUID
    ) -> Optional[Job]:
        stmt = select(Job).where(
            Job.id == record_id,
            Job.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, record_id: UUID) -> bool:
        stmt = (
            update(Job)
            .where(
                Job.id == record_id,
                Job.deleted_at.is_(None),
            )
            .values(
                deleted_at=datetime.utcnow(),
                status=JobStatus.CLOSED.value,
            )
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0