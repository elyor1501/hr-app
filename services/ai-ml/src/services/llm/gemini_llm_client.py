import os
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

    def generate_json(self, prompt: str) -> Dict[str, Any]:

        try:
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
                raise RuntimeError("No response object from Gemini")

            if not response.text:
                raise RuntimeError("Gemini response.text is empty")

            raw_text = response.text.strip()

            try:
                parsed = json.loads(raw_text)
                return parsed
            except json.JSONDecodeError:
                pass

            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()

            start = raw_text.find("{")
            end = raw_text.rfind("}") + 1

            if start != -1 and end > start:
                json_str = raw_text[start:end]
                return json.loads(json_str)

            raise RuntimeError("Gemini returned non-JSON output")

        except Exception as e:
            logger.exception("Gemini generation failed")
            raise RuntimeError(str(e))