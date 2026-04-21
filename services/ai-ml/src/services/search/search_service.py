import time
from typing import List

from schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchMatch,
    SearchMetrics,
)
from services.rag.retriever import RAGRetriever


MAX_BATCH_SIZE = 10


class SearchService:

    def __init__(self):
        self.retriever = RAGRetriever()

    async def search(self, request: SearchRequest) -> SearchResponse:
        start_time = time.time()

        queries = []

        if request.query_text:
            queries.append({"query_text": request.query_text})

        if request.batch:
            if len(request.batch) > MAX_BATCH_SIZE:
                raise ValueError("Batch size cannot exceed 10")
            for q in request.batch:
                queries.append({"query_text": q.query_text})

        if not queries:
            raise ValueError("No valid query provided")

        results: List[SearchResult] = []

        for idx, q in enumerate(queries):
            matches = await self.retriever.retrieve_top_k(
                q["query_text"],
                k=request.top_k
            )

            filtered = [
                SearchMatch(
                    source_file=m["source_file"],
                    text_chunk=m["text_chunk"],
                    score=m["score"]
                )
                for m in matches
                if m["score"] >= request.min_score
            ]

            results.append(SearchResult(query_index=idx, matches=filtered))

        total_time = (time.time() - start_time) * 1000

        return SearchResponse(
            results=results,
            metrics=SearchMetrics(processing_time_ms=total_time)
        )
