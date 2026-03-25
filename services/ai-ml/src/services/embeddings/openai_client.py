import os
from typing import List

from openai import OpenAI

from .exceptions import OpenAIEmbeddingError


OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"


class OpenAIEmbeddingClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")

        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        self.client = OpenAI(api_key=self.api_key)

    def embed_text(self, text: str) -> List[float]:
        try:
            response = self.client.embeddings.create(
                model=OPENAI_EMBEDDING_MODEL,
                input=text,
            )

            return response.data[0].embedding

        except Exception as exc:
            raise OpenAIEmbeddingError(str(exc)) from exc

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        try:
            response = self.client.embeddings.create(
                model=OPENAI_EMBEDDING_MODEL,
                input=texts,
            )

            return [item.embedding for item in response.data]

        except Exception as exc:
            raise OpenAIEmbeddingError(str(exc)) from exc
