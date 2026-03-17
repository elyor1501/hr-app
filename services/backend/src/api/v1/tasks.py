from fastapi import APIRouter, Depends
from src.api.deps import get_current_user
from src.services.task_queue import get_task_status
from src.models.base import BaseSchema
from typing import Optional, Dict, Any

router = APIRouter()

class TaskStatusResponse(BaseSchema):
    task_id: str
    status: str
    progress: int
    message: str
    result: Optional[Dict[str, Any]] = None

@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def check_task_status(task_id: str, current_user=Depends(get_current_user)):
    result = await get_task_status(task_id)
    if not result:
        return TaskStatusResponse(task_id=task_id, status="pending", progress=0, message="Waiting in queue...")
    return TaskStatusResponse(**result)