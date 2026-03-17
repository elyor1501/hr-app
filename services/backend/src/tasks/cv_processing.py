import structlog
from uuid import UUID
from arq import ArqRedis
from src.db.session import async_session_maker
from src.db.models import Resume
from src.services.ai_client import AIClient

logger = structlog.get_logger()
ai_client = AIClient()

async def process_resume_task(ctx: dict, resume_id: str, file_url: str, file_type: str):
    redis: ArqRedis = ctx["redis"]
    job_id = ctx.get("job_id")
    
    try:
        # Update progress in Redis for the Frontend to see
        await redis.set(f"task:{job_id}:status", "processing")
        await redis.set(f"task:{job_id}:progress", 20)
        await redis.set(f"task:{job_id}:message", "Extracting text using AI service...")
        
        # 1. Call Varun's Service on port 8001
        extract_data = await ai_client.extract_text(file_url, file_type, resume_id)
        raw_text = extract_data.get("raw_text", "")
        
        await redis.set(f"task:{job_id}:progress", 60)
        await redis.set(f"task:{job_id}:message", "Generating 3072-dim embeddings...")

        # 2. Convert extracted text to 3072-dim Embedding
        embedding = await ai_client.get_embeddings(raw_text)
        
        # 3. Save everything back to Supabase
        async with async_session_maker() as session:
            resume = await session.get(Resume, UUID(resume_id))
            if resume:
                resume.raw_text = raw_text
                resume.embedding = embedding
                await session.commit()
                logger.info("resume_processed_successfully", resume_id=resume_id)
        
        # Mark as 100% complete
        await redis.set(f"task:{job_id}:status", "completed")
        await redis.set(f"task:{job_id}:progress", 100)
        await redis.set(f"task:{job_id}:message", "Resume processed and indexed.")
        
    except Exception as e:
        logger.error("resume_task_failed", error=str(e), resume_id=resume_id)
        await redis.set(f"task:{job_id}:status", "failed")
        await redis.set(f"task:{job_id}:message", f"Error: {str(e)}")
        raise e