import numpy as np
from typing import List, Dict
 
 
class InMemoryVectorStore:
    """
    Simple in-memory vector store for RAG retrieval.
    Suitable for small datasets (<= few thousand chunks).
    """
 
    def __init__(self):
        self.vectors: List[Dict] = []
 
    def add(self, source_file: str, text_chunk: str, embedding: List[float]):
        self.vectors.append({
            "source_file": source_file,
            "text_chunk": text_chunk,
            "embedding": np.array(embedding)
        })
 
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        if denom == 0:
            return 0.0
        return float(np.dot(a, b) / denom)
 
    def search(self, query_embedding: List[float], top_k: int = 5):
        if not self.vectors:
            return []
 
        query_vec = np.array(query_embedding)
 
        scored = []
 
        for item in self.vectors:
            score = self._cosine_similarity(query_vec, item["embedding"])
            scored.append((score, item))
 
        scored.sort(key=lambda x: x[0], reverse=True)
 
        results = []
 
        for score, item in scored[:top_k]:
            results.append({
                "source_file": item["source_file"],
                "text_chunk": item["text_chunk"],
                "score": score
            })
 
        return results
 