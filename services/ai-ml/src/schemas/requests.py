from pydantic import BaseModel
from typing import Optional, List


class InferenceRequest(BaseModel):
    text: str
    task: Optional[str] = "general"


# ---------- Embedding Schemas ----------

class EmbeddingRequest(BaseModel):
    text: str


class BatchEmbeddingRequest(BaseModel):
    texts: List[str]
