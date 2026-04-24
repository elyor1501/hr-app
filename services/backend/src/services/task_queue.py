import json
from typing import Optional, Dict, Any
from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
import structlog
from src.core.config import settings

logger = structlog.get_logger()

_arq_pool: Optional[ArqRedis] = None


async def get_task_queue() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(
            RedisSettings(
                host=settings.redis_host,
                port=settings.redis_port,
            )
        )
    return _arq_pool


async def close_task_queue() -> None:
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.close()
        _arq_pool = None


async def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_task_queue()

    keys_to_try = [
        f"hr_worker::jobs:{task_id}",
        f"hr_worker:jobs:{task_id}",
        f"hr_backend::jobs:{task_id}",
        f"hr_backend:jobs:{task_id}",
        f"{settings.cache_prefix}:jobs:{task_id}",
        f"{settings.cache_prefix}jobs:{task_id}",
    ]

    for key in keys_to_try:
        raw_data = await pool.get(key)
        if raw_data:
            data = json.loads(raw_data)
            status = data.get("status", "unknown")
            progress = data.get("progress", 0)

            if status == "completed":
                message = "Extraction completed successfully"
            elif status == "dead":
                message = data.get("error") or "Extraction failed permanently"
            elif status == "retrying":
                message = "Retrying after error..."
            elif status in ("in_progress", "processing"):
                message = f"Processing... {progress}%"
            else:
                message = "Waiting in queue..."

            return {
                "task_id": task_id,
                "status": status,
                "progress": progress,
                "message": message,
                "result": data.get("result"),
                "error": data.get("error"),
            }

    return None