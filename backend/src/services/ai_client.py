from datetime import timedelta
from typing import Any, Dict, List, Optional
import httpx
from aiobreaker import CircuitBreaker
import structlog
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

logger = structlog.get_logger()

# Circuit Breaker: Opens after 5 failures
# Fix: timeout_duration must be a timedelta, not an int
ai_breaker = CircuitBreaker(
    fail_max=5,
    timeout_duration=timedelta(seconds=60),
    exclude=[],  # Don't exclude any exceptions (count 500s as failures)
)


class AIClient:
    def __init__(self):
        self.base_url = "http://ai-service:8080"
        self.timeout = httpx.Timeout(30.0)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_fixed(0.1),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        reraise=True
    )
    async def _request(self, method: str, endpoint: str, payload: Optional[Dict] = None):
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        @ai_breaker
        async def _make_call():
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info("ai_req", method=method, url=url)
                resp = await client.request(method, url, json=payload)
                resp.raise_for_status()
                return resp.json()

        return await _make_call()

    async def get_embeddings(self, text: str) -> List[float]:
        res = await self._request("POST", "/embeddings", {"text": text})
        return res.get("embedding", [])

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        return await self._request("POST", "/analyze/resume", {"text": resume_text})