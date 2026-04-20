import httpx
import structlog
from typing import Any, Dict, List, Optional
from src.core.config import settings

logger = structlog.get_logger()

_client: Optional[httpx.AsyncClient] = None


async def get_ai_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def close_ai_http_client():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


class AIClient:
    def __init__(self):
        self.base_url = settings.ai_service_url

    async def _request(self, method: str, endpoint: str, payload: Optional[Dict] = None):
        url = f"{self.base_url.rstrip('/')}/api/v1{endpoint}"
        client = await get_ai_http_client()
        try:
            logger.info("ai_req", method=method, url=url)
            resp = await client.request(method, url, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            body = e.response.text
            logger.error("ai_service_error", error=str(e), url=url, status_code=e.response.status_code, response_body=body[:500])
            raise e
        except Exception as e:
            logger.error("ai_service_error", error=str(e), url=url)
            raise e

    async def extract_text(self, file_url: str, file_type: str, resume_id: str) -> Dict[str, Any]:
        return await self._request("POST", "/extract", {
            "resume_id": str(resume_id),
            "file_url": file_url,
            "file_type": file_type
        })

    async def get_embeddings(self, text: str) -> List[float]:
        res = await self._request("POST", "/embeddings/embed", {"text": text})
        return res.get("embedding", [])

    async def get_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        res = await self._request("POST", "/embeddings/embed-batch", {"texts": texts})
        return res.get("embeddings", [])

    async def structure_resume(self, raw_text: str, resume_id: str) -> Dict[str, Any]:
        return await self._request("POST", "/structure", {
            "resume_id": str(resume_id),
            "raw_text": raw_text
        })

    async def calculate_match(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        return await self._request("POST", "/inference/match", {
            "resume": resume_text,
            "job_description": job_description
        })

    async def rag_match(self, job_description: str, structured_cv: dict) -> Dict[str, Any]:
        candidate_name = (
            structured_cv.get("full_name")
            or structured_cv.get("name")
            or "Unknown"
        )
        candidate_payload = dict(structured_cv)
        candidate_payload["name"] = candidate_name

        response = await self._request("POST", "/match", {
            "job_descriptions": [job_description],
            "candidates": [candidate_payload]
        })

        try:
            results = response.get("results", [])
            if results:
                matches = results[0].get("matches", [])
                if matches:
                    match = matches[0]
                    if "match_result" in match and isinstance(match["match_result"], dict):
                        result = match["match_result"]
                        result["candidate_name"] = match.get("candidate_name", candidate_name)
                        return result
                    return {
                        "match_score": match.get("match_score", 0),
                        "reasoning": match.get("reasoning", ""),
                        "strengths": match.get("strengths", []),
                        "gaps": match.get("gaps", []),
                        "recommendations": match.get("recommendations", []),
                    }
        except (IndexError, KeyError, TypeError) as e:
            logger.error("rag_match_parse_failed", error=str(e), response=str(response)[:500])

        return {
            "match_score": 0,
            "reasoning": "Failed to parse match result",
            "strengths": [],
            "gaps": [],
            "recommendations": []
        }

    async def semantic_search(self, query_text: str = None, query_embedding: List[float] = None, top_k: int = 5, min_score: float = 0.0) -> Dict[str, Any]:
        payload = {"top_k": top_k, "min_score": min_score}
        if query_text:
            payload["query_text"] = query_text
        if query_embedding:
            payload["query_embedding"] = query_embedding
        return await self._request("POST", "/search", payload)