import os
import re
import json
import logging
from typing import Any, Dict

from google import genai

logger = logging.getLogger(__name__)


class GeminiLLMClient:

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

        print("===== GEMINI CLIENT INIT =====")
        print("API KEY PRESENT:", bool(self.api_key))
        print("==============================")

        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash"

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
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config={
                "temperature": 0,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json"
            }
        )

        if not response:
            raise RuntimeError("No response from Gemini")

        if not response.text:
            raise RuntimeError("Gemini response.text is empty")

        return response.text

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        raw_text = self._call_gemini(prompt)
        result = self._try_parse_json(raw_text)

        if result is not None:
            return result

        logger.warning("First Gemini attempt returned invalid JSON — retrying with strict prompt")

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

        logger.error("Both Gemini attempts returned invalid JSON — returning empty fallback")
        return {}