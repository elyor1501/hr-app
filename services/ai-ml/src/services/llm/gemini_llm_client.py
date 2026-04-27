import os
import re
import json
import logging
from typing import Any, Dict, List

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

    def _try_parse_json_array(self, text: str) -> List[Dict[str, Any]] | None:
        text = text.strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        start = text.find("[")
        end = text.rfind("]") + 1
        if start != -1 and end > start:
            text = text[start:end]

        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        text = re.sub(r',\s*}', '}', text)
        text = re.sub(r',\s*]', ']', text)
        text = re.sub(r':\s*,', ': null,', text)
        text = re.sub(r':\s*}', ': null}', text)

        try:
            result = json.loads(text)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
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

    def generate_json_batch(self, resume_texts: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        n = len(resume_texts)

        resumes_block = ""
        for i, item in enumerate(resume_texts):
            resumes_block += f"\n\n--- RESUME {i+1} (id: {item['resume_id']}) ---\n{item['raw_text']}\n"

        prompt = f"""You will extract structured data from {n} resumes below.

Return a JSON ARRAY with exactly {n} objects in the same order as the resumes.
Each object must follow this exact structure:

{{
  "resume_id": "the id from the header",
  "full_name": string or null,
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "linkedin": string or null,
  "github": string or null,
  "portfolio": string or null,
  "summary": string or null,
  "skills": [string],
  "education": [{{"degree": string, "institution": string, "start_date": string, "end_date": string, "field_of_study": string, "grade": string, "confidence": float}}],
  "experience": [{{"job_title": string, "company": string, "location": string, "start_date": string, "end_date": string, "responsibilities": [string], "confidence": float}}],
  "projects": [],
  "certifications": [],
  "confidence_scores": {{"full_name": float, "email": float, "phone": float, "location": float, "skills": float, "education": float, "experience": float, "projects": float, "overall": float}},
  "confidence_score": float,
  "extraction_latency": 0.0
}}

Return ONLY a valid JSON array. No markdown. No explanation.
{resumes_block}"""

        raw_text = self._call_gemini(prompt)
        results = self._try_parse_json_array(raw_text)

        if results and len(results) == n:
            logger.info(f"Batch extraction succeeded for {n} resumes")
            return results

        logger.warning(f"Batch parse failed — falling back to individual extraction for {n} resumes")
        fallback = []
        for item in resume_texts:
            result = self.generate_json(f"""Extract resume data as JSON:\n{item['raw_text']}""")
            result["resume_id"] = item["resume_id"]
            fallback.append(result)
        return fallback