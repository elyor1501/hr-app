import logging
from services.rag.match_prompt import build_match_prompt
from services.llm.gemini_llm_client import GeminiLLMClient

logger = logging.getLogger(__name__)


class MatchService:

    def __init__(self):
        self.llm = GeminiLLMClient()

    async def match_candidates(self, job_descriptions, candidates):
        results = []

        for job_description in job_descriptions:
            job_matches = []

            for candidate in candidates:
                try:
                    retrieved_chunks = []
                    try:
                        from services.rag.retriever import RAGRetriever
                        retriever = RAGRetriever()
                        retrieved_chunks = await retriever.retrieve_top_k(job_description, k=5)
                    except Exception as e:
                        logger.warning(f"RAG retrieval skipped: {e}")
                        retrieved_chunks = []

                    prompt = build_match_prompt(
                        job_description=job_description,
                        structured_cv=candidate,
                        retrieved_chunks=retrieved_chunks
                    )

                    result = self.llm.generate_json(prompt)

                    job_matches.append({
                        "candidate_name": candidate.get("name") or candidate.get("full_name") or "Unknown",
                        "match_result": result
                    })

                except Exception as e:
                    logger.error(f"Match failed for candidate: {e}")
                    job_matches.append({
                        "candidate_name": candidate.get("name") or candidate.get("full_name") or "Unknown",
                        "match_score": 0,
                        "reasoning": f"Match processing error: {str(e)}",
                        "strengths": [],
                        "gaps": [],
                        "recommendations": []
                    })

            results.append({
                "job_description": job_description,
                "matches": job_matches
            })

        return results