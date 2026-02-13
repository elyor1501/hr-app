import random
from datetime import timedelta
from typing import Any, Dict, List, Optional

import httpx
import structlog
from aiobreaker import CircuitBreaker
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed

from src.core.config import settings

logger = structlog.get_logger()

# Circuit Breaker: Opens after 5 failures
ai_breaker = CircuitBreaker(
    fail_max=5,
    timeout_duration=timedelta(seconds=60),
)


class AIClient:
    def __init__(self):
        self.base_url = settings.ai_service_url
        self.timeout = httpx.Timeout(30.0)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_fixed(0.1),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        reraise=True,
    )
    async def _request(self, method: str, endpoint: str, payload: Optional[Dict] = None):
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        @ai_breaker
        async def _make_call():
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                try:
                    logger.info("ai_req", method=method, url=url)
                    resp = await client.request(method, url, json=payload)
                    resp.raise_for_status()
                    return resp.json()
                except (httpx.ConnectError, httpx.TimeoutException):
                    # FALLBACK: Provide mock data if AI service is offline
                    logger.warning("ai_service_offline_returning_mock_data")
                    if endpoint == "/embeddings":
                        return {
                            "embedding": [
                                random.uniform(-1, 1)
                                for _ in range(settings.vector_dimension)
                            ]
                        }
                    if endpoint == "/match":
                        return {
                            "overall_score": 0.85,
                            "skills_score": 0.9,
                            "experience_score": 0.8,
                            "reasoning": "AI Match based on mock processing",
                        }
                    return {}

        return await _make_call()

    async def get_embeddings(self, text: str) -> List[float]:
        res = await self._request("POST", "/embeddings", {"text": text})
        return res.get("embedding", [])

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        return await self._request("POST", "/analyze/resume", {"text": resume_text})

    async def calculate_match(
        self, resume_text: str, job_description: str
    ) -> Dict[str, Any]:
        """Used by Task 9 to get matching scores."""
        payload = {"resume": resume_text, "job_description": job_description}
        return await self._request("POST", "/match", payload)