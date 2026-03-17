from pydantic import BaseModel
from typing import List


class InferenceResponse(BaseModel):
    output: str
    model: str


# ---------- Embedding Schemas ----------

class EmbeddingResponse(BaseModel):
    dimension: int
    embedding: List[float]


class BatchEmbeddingResponse(BaseModel):
    dimension: int
    count: int
    embeddings: List[List[float]]
    