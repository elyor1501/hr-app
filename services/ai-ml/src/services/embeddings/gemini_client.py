import os
from typing import List
import logging

from google import genai
from google.genai.types import EmbedContentConfig

from .exceptions import GeminiEmbeddingError

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-embedding-001"
EXPECTED_DIMENSION = 3072
MAX_BATCH_SIZE = 100


class GeminiEmbeddingClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")

        self.client = genai.Client(api_key=self.api_key)

    # ---------- SINGLE ----------

    def embed_text(self, text: str) -> List[float]:
        if not text or not isinstance(text, str):
            raise GeminiEmbeddingError("Input text must be a non-empty string")

        try:
            response = self.client.models.embed_content(
                model=MODEL_NAME,
                contents=text,
                config=EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )

            embedding = response.embeddings[0].values

            if len(embedding) != EXPECTED_DIMENSION:
                raise RuntimeError(
                    f"Embedding dimension mismatch. "
                    f"Expected {EXPECTED_DIMENSION}, got {len(embedding)}"
                )

            return embedding

        except Exception as exc:
            logger.exception("Gemini single embedding failed")
            raise GeminiEmbeddingError(str(exc)) from exc

    # ---------- BATCH ----------

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts or not isinstance(texts, list):
            raise GeminiEmbeddingError("Input must be a non-empty list")

        if len(texts) > MAX_BATCH_SIZE:
            raise GeminiEmbeddingError(
                f"Batch size exceeds limit of {MAX_BATCH_SIZE}"
            )

        try:
            response = self.client.models.embed_content(
                model=MODEL_NAME,
                contents=texts,
                config=EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )

            results = []

            for emb in response.embeddings:
                values = emb.values

                if len(values) != EXPECTED_DIMENSION:
                    raise RuntimeError(
                        f"Embedding dimension mismatch. "
                        f"Expected {EXPECTED_DIMENSION}, got {len(values)}"
                    )

                results.append(values)

            return results

        except Exception as exc:
            logger.exception("Gemini batch embedding failed")
            raise GeminiEmbeddingError(str(exc)) from exc