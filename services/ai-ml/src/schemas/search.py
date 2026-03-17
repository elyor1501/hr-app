from pydantic import BaseModel
from typing import List, Optional
 
 
class SearchMatch(BaseModel):
    source_file: str
    text_chunk: str
    score: float
 
 
class SearchMetrics(BaseModel):
    processing_time_ms: float
 
 
class SearchQuery(BaseModel):
    query_text: Optional[str] = None
    query_embedding: Optional[List[float]] = None
 
 
class SearchRequest(BaseModel):
    query_text: Optional[str] = None
    query_embedding: Optional[List[float]] = None
    batch: Optional[List[SearchQuery]] = None
    top_k: int = 5
    min_score: float = 0.0
 
 
class SearchResult(BaseModel):
    query_index: int
    matches: List[SearchMatch]
 
 
class SearchResponse(BaseModel):
    results: List[SearchResult]
    metrics: SearchMetrics