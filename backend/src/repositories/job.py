from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Job
from src.models.enums import JobStatus
from src.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    """Repository for Job operations with soft delete support."""

    def __init__(self, session: AsyncSession):
        super().__init__(Job, session)

    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        search: Optional[str] = None, 
        status: Optional[JobStatus] = None
    ) -> List[Job]:
        """Get all jobs with optional search and status filtering."""
        stmt = select(Job).where(Job.deleted_at.is_(None))
        
        # Filter by status if provided
        if status:
            stmt = stmt.where(Job.status == status)
            
        # Search in title or description (Case-insensitive)
        if search:
            search_filter = f"%{search}%"
            stmt = stmt.where(
                (Job.title.ilike(search_filter)) | 
                (Job.description.ilike(search_filter))
            )
            
        stmt = stmt.offset(skip).limit(limit).order_by(Job.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, record_id: UUID) -> Optional[Job]:
        """Get job by ID if not deleted."""
        stmt = select(Job).where(Job.id == record_id, Job.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, record_id: UUID) -> bool:
        """Soft delete a job."""
        stmt = (
            update(Job)
            .where(Job.id == record_id)
            .values(deleted_at=datetime.utcnow(), status=JobStatus.CLOSED)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0