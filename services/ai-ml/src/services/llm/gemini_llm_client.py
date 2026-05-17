import os
import re
import json
import logging
import asyncio
import concurrent.futures
from typing import Any, Dict, List

from google import genai

logger = logging.getLogger(__name__)

# Gemini 2.5 Flash standard tier — https://ai.google.dev/gemini-api/docs/pricing
# Output rate is identical whether thinking is enabled or disabled; this path runs with
# thinking_budget=0 (configured below) so output reflects only the JSON payload.
_INPUT_COST_PER_TOKEN  = 0.30 / 1_000_000   # $0.30 per 1M input tokens
_OUTPUT_COST_PER_TOKEN = 2.50 / 1_000_000   # $2.50 per 1M output tokens


class GeminiLLMClient:

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash"

        # Accumulated since last consume_session_cost() call.
        # Not thread-safe for concurrent batch processing — use per-call logs for accuracy there.
        self._session_input_tokens: int = 0
        self._session_output_tokens: int = 0

    def _clean_json_string(self, raw: str) -> str:
        raw = raw.strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
        raw = re.sub(r',\s*}', '}', raw)
        raw = re.sub(r',\s*]', ']', raw)
        raw = re.sub(r':\s*,', ': null,', raw)
        raw = re.sub(r':\s*}', ': null}', raw)

        return raw

    def _try_parse_json(self, text: str) -> Dict[str, Any] | None:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        cleaned = self._clean_json_string(text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        try:
            import ast
            fixed = ast.literal_eval(cleaned)
            if isinstance(fixed, dict):
                return fixed
        except Exception:
            pass

        return None

    def _call_gemini(self, prompt: str) -> str:
        # ThreadPoolExecutor allows future.result(timeout=) to enforce a hard ceiling;
        # the SDK has no native timeout parameter in this version
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                self.client.models.generate_content,
                model=self.model_name,
                contents=prompt,
                config={
                    "temperature": 0,
                    "max_output_tokens": 32768,
                    "response_mime_type": "application/json",
                    # thinking_budget=0 disables extended reasoning; adds 3-8s latency per call
                    # with no accuracy benefit for deterministic JSON extraction tasks
                    "thinking_config": {"thinking_budget": 0}
                }
            )
            try:
                response = future.result(timeout=60)
            except concurrent.futures.TimeoutError:
                raise RuntimeError("Gemini request timed out after 60 seconds")

        if not response:
            raise RuntimeError("No response from Gemini")

        if not response.text:
            raise RuntimeError("Gemini response.text is empty")

        # Extract usage metadata and log cost for every call
        usage = getattr(response, "usage_metadata", None)
        input_tokens  = int(getattr(usage, "prompt_token_count",     0) or 0)
        output_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
        call_cost_usd = (input_tokens * _INPUT_COST_PER_TOKEN
                         + output_tokens * _OUTPUT_COST_PER_TOKEN)

        self._session_input_tokens  += input_tokens
        self._session_output_tokens += output_tokens

        logger.info("gemini_call_tokens", extra={
            "input_tokens":   input_tokens,
            "output_tokens":  output_tokens,
            "call_cost_usd":  round(call_cost_usd, 6),
        })

        return response.text

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        raw_text = self._call_gemini(prompt)
        result = self._try_parse_json(raw_text)

        if result is not None:
            return result

        logger.warning("First Gemini attempt returned invalid JSON, retrying with strict prompt")

        strict_suffix = (
            "\n\nCRITICAL: Your previous response was not valid JSON. "
            "Return ONLY a single valid JSON object. "
            "No markdown, no code blocks, no explanation. "
            "Every string value must be properly quoted. "
            "Every array and object must be properly closed. "
            "Do not truncate the response."
        )

        raw_text_retry = self._call_gemini(prompt + strict_suffix)
        result = self._try_parse_json(raw_text_retry)

        if result is not None:
            logger.info("Retry succeeded with strict prompt")
            return result

        logger.error("Both Gemini attempts returned invalid JSON, returning empty fallback")
        return {}

    def consume_session_cost(self) -> dict:
        """
        Returns the accumulated token counts and cost since the last call, then resets.
        Call this once per CV at the end of _local_structure() to get per-CV spend.
        """
        input_t  = self._session_input_tokens
        output_t = self._session_output_tokens
        total_cost_usd = (input_t * _INPUT_COST_PER_TOKEN
                          + output_t * _OUTPUT_COST_PER_TOKEN)
        self._session_input_tokens  = 0
        self._session_output_tokens = 0
        return {
            "input_tokens":    input_t,
            "output_tokens":   output_t,
            "total_cost_usd":  round(total_cost_usd, 6),
        }

    async def generate_json_async(self, prompt: str) -> Dict[str, Any]:
        return await asyncio.to_thread(self.generate_json, prompt)