from sentence_transformers import SentenceTransformer

class LocalFallbackEmbeddingClient:
    def __init__(self):
        self.model = SentenceTransformer(
            "sentence-transformers/all-mpnet-base-v2"
        )

    def embed_text(self, text: str):
        return self.model.encode(
            text,
            normalize_embeddings=True
        ).tolist()

    def embed_batch(self, texts: list[str]):
        embeddings = self.model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True
        )
        return [e.tolist() for e in embeddings]
