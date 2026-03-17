import logging
from services.embeddings.service import EmbeddingService

logger = logging.getLogger(__name__)


class RAGRetriever:

    def __init__(self):
        self.embedder = EmbeddingService()

    async def retrieve_top_k(self, query_text: str, k: int = 5):
        if not query_text or not query_text.strip():
            return []

        try:
            from sqlalchemy import text as sql_text
            from db.session import async_session_maker

            query_embedding = self.embedder.get_embedding(query_text)

            if not query_embedding:
                return []

            embedding_str = "[" + ",".join(str(float(v)) for v in query_embedding) + "]"

            sql = sql_text(
                "SELECT id, first_name, last_name, "
                "1 - (embedding <=> CAST(:query_embedding AS vector)) AS score "
                "FROM candidates "
                "WHERE embedding IS NOT NULL "
                "ORDER BY embedding <=> CAST(:query_embedding AS vector) "
                "LIMIT :limit"
            )

            async with async_session_maker() as session:
                result = await session.execute(
                    sql,
                    {
                        "query_embedding": embedding_str,
                        "limit": k
                    }
                )
                rows = result.fetchall()

            matches = []
            for r in rows:
                matches.append({
                    "source_file": f"{r.first_name} {r.last_name}",
                    "text_chunk": f"{r.first_name} {r.last_name}",
                    "score": float(r.score)
                })

            return matches

        except Exception as e:
            logger.error(f"RAG retrieval error: {e}")
            return []