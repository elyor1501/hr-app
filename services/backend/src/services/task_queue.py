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
    key = f"{settings.cache_prefix}:jobs:{task_id}"
    raw_data = await pool.get(key)
    if not raw_data:
        return None
    data = json.loads(raw_data)
    return {
        "task_id": task_id,
        "status": data.get("status", "unknown"),
        "progress": data.get("progress", 0),
        "message": data.get("error") or "Processing...",
        "result": data.get("result")
    } 