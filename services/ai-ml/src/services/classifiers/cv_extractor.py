import json
from pathlib import Path

from pydantic import ValidationError

from schemas.extracted_cv import ExtractedCV
from services.llm.gemini_llm_client import GeminiLLMClient


class CVExtractor:

    def __init__(self):
        self.client = GeminiLLMClient()
        self.prompt_template = self._load_prompt()

    def _load_prompt(self) -> str:
        path = Path("src/prompts/cv_extraction_prompt.txt")
        return path.read_text()

    def extract(self, cv_text: str) -> ExtractedCV:
        prompt = self.prompt_template.replace("{cv_text}", cv_text)

        raw_output = self.client.generate_json(prompt)

        try:
            parsed = json.loads(raw_output) if isinstance(raw_output, str) else raw_output
            if not parsed.get("full_name"):
                parsed["full_name"] = ""
            return ExtractedCV(**parsed)

        except (json.JSONDecodeError, ValidationError):
            retry_prompt = prompt + "\n\nReturn only valid JSON. Do not include markdown."
            raw_output = self.client.generate_json(retry_prompt)
            parsed = json.loads(raw_output) if isinstance(raw_output, str) else raw_output
            if not parsed.get("full_name"):
                parsed["full_name"] = ""
            return ExtractedCV(**parsed)
