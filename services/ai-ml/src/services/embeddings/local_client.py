from sentence_transformers import SentenceTransformer
import threading
from typing import List

EXPECTED_DIMENSION = 768
MAX_BATCH_SIZE = 100


class LocalEmbeddingClient:
    """
    Local fallback embedding provider.
    Uses BAAI/bge-base-en (768-dim).
    Singleton pattern ensures model loads only once.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance.model = SentenceTransformer(
                        "BAAI/bge-base-en"
                    )
                    cls._instance = instance
        return cls._instance

    def embed_text(self, text: str) -> List[float]:
        if not text or not isinstance(text, str):
            raise ValueError("Input text must be a non-empty string")

        embedding = self.model.encode(
            text,
            normalize_embeddings=True
        )

        embedding = embedding.tolist()

        if len(embedding) != EXPECTED_DIMENSION:
            raise ValueError(
                f"Local embedding dimension mismatch: "
                f"expected {EXPECTED_DIMENSION}, got {len(embedding)}"
            )

        return embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts or not isinstance(texts, list):
            raise ValueError("Input must be a non-empty list of strings")

        if len(texts) > MAX_BATCH_SIZE:
            raise ValueError(
                f"Batch size cannot exceed {MAX_BATCH_SIZE}"
            )

        embeddings = self.model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True
        )

        results = []

        for emb in embeddings:
            emb_list = emb.tolist()

            if len(emb_list) != EXPECTED_DIMENSION:
                raise ValueError(
                    f"Local embedding dimension mismatch: "
                    f"expected {EXPECTED_DIMENSION}, got {len(emb_list)}"
                )

            results.append(emb_list)

        return results
