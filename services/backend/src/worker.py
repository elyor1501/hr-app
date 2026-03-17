import os
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
import structlog
from arq.connections import RedisSettings
from sqlalchemy import select
from src.core.config import settings
from src.db.session import async_session_maker
from src.db.models import Resume, ParsedResume, Candidate, MatchResult
from src.services.ai_client import AIClient

logger = structlog.get_logger()
ai_client = AIClient()

async def update_job_status(ctx: Dict[str, Any], job_id: str, status: str, progress: int = 0, result: Optional[Dict] = None, error: Optional[str] = None):
    redis = ctx.get("redis")
    if redis:
        key = f"{settings.cache_prefix}:jobs:{job_id}"
        data = {"job_id": job_id, "status": status, "progress": progress, "result": result, "error": error, "updated_at": datetime.utcnow().isoformat()}
        await redis.setex(key, settings.job_result_ttl, json.dumps(data))

async def move_to_dlq(ctx: Dict[str, Any], job_id: str, error: str):
    redis = ctx.get("redis")
    if redis:
        dlq_key = f"{settings.cache_prefix}:dlq"
        data = {"job_id": job_id, "error": error, "failed_at": datetime.utcnow().isoformat()}
        await redis.lpush(dlq_key, json.dumps(data))

def calculate_years_experience(experience_list: List[Dict[str, Any]]) -> Optional[int]:
    if not isinstance(experience_list, list): return None
    total_months = 0
    current_year = datetime.utcnow().year
    for exp in experience_list:
        if not isinstance(exp, dict): continue
        start = exp.get("start_date")
        end = exp.get("end_date")
        try:
            if start and isinstance(start, str) and len(start) >= 4:
                start_year = int(start[:4])
                if end and isinstance(end, str) and end.lower() != "present" and len(end) >= 4:
                    end_year = int(end[:4])
                else:
                    end_year = current_year
                total_months += (end_year - start_year) * 12
        except Exception:
            continue
    return total_months // 12 if total_months > 0 else None

async def process_resume(ctx: Dict[str, Any], resume_id: str, file_url: str, file_type: str) -> Dict[str, Any]:
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "in_progress", progress=10)
        
        extract_data = await ai_client.extract_text(file_url, file_type, resume_id)
        raw_text = extract_data.get("raw_text", "")
        
        await update_job_status(ctx, job_id, "in_progress", progress=40)
        
        embedding = await ai_client.get_embeddings(raw_text)
        
        await update_job_status(ctx, job_id, "in_progress", progress=60)
        
        structured_res = await ai_client.structure_resume(raw_text, resume_id)
        structured_data = structured_res.get("structured_data", {})
        
        await update_job_status(ctx, job_id, "in_progress", progress=80)
        
        full_name = (structured_data.get("full_name") or "").strip()
        name_parts = full_name.split()
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        years_exp = calculate_years_experience(structured_data.get("experience", []))
        
        async with async_session_maker() as session:
            resume = await session.get(Resume, UUID(resume_id))
            if resume:
                resume.raw_text = raw_text
                resume.embedding = embedding
            
            if structured_data:
                parsed = ParsedResume(
                    resume_id=UUID(resume_id),
                    first_name=first_name,
                    last_name=last_name,
                    email=structured_data.get("email"),
                    phone=structured_data.get("phone"),
                    current_title=None,
                    current_company=None,
                    years_of_experience=years_exp,
                    skills=structured_data.get("skills", []),
                    location=structured_data.get("location"),
                    linkedin_url=structured_data.get("linkedin"),
                    github=structured_data.get("github"),
                    portfolio=structured_data.get("portfolio"),
                    summary=structured_data.get("summary"),
                    education=structured_data.get("education", []),
                    experience=structured_data.get("experience", []),
                    projects=structured_data.get("projects", []),
                    certifications=structured_data.get("certifications", []),
                    confidence_scores=structured_data.get("confidence_scores", {}),
                    confidence_score=structured_data.get("confidence_score"),
                    extraction_latency=structured_data.get("extraction_latency"),
                    json_data=structured_data
                )
                
                if structured_data.get("experience") and len(structured_data["experience"]) > 0:
                    parsed.current_title = structured_data["experience"][0].get("job_title")
                    parsed.current_company = structured_data["experience"][0].get("company")
                    
                session.add(parsed)

                candidate = await session.get(Candidate, UUID(resume_id))
                if candidate:
                    candidate.json_data = structured_data
                    candidate.resume_text = raw_text
                    candidate.embedding = embedding
                    if not candidate.first_name and first_name != "Unknown":
                        candidate.first_name = first_name
                    if not candidate.last_name and last_name:
                        candidate.last_name = last_name
                    if not candidate.skills and structured_data.get("skills"):
                        candidate.skills = structured_data.get("skills")

            await session.commit()

        result = {"resume_id": resume_id, "text_length": len(raw_text), "embedding_generated": True}
        await update_job_status(ctx, job_id, "completed", progress=100, result=result)
        return result
        
    except Exception as e:
        error_msg = str(e)
        logger.error("process_resume_failed", job_id=job_id, error=error_msg)
        job_try = ctx.get("job_try", 1)
        if job_try >= settings.job_max_retries:
            await move_to_dlq(ctx, job_id, error_msg)
            await update_job_status(ctx, job_id, "dead", error=error_msg)
        else:
            await update_job_status(ctx, job_id, "retrying", error=error_msg)
            raise
        return {"error": error_msg}

async def generate_embeddings(ctx: Dict[str, Any], record_type: str, record_id: str, text: str) -> Dict[str, Any]:
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "in_progress", progress=20)
        embedding = await ai_client.get_embeddings(text)
        await update_job_status(ctx, job_id, "in_progress", progress=80)
        result = {"record_type": record_type, "record_id": record_id, "embedding_dimension": len(embedding)}
        await update_job_status(ctx, job_id, "completed", progress=100, result=result)
        return result
    except Exception as e:
        error_msg = str(e)
        job_try = ctx.get("job_try", 1)
        if job_try >= settings.job_max_retries:
            await move_to_dlq(ctx, job_id, error_msg)
            await update_job_status(ctx, job_id, "dead", error=error_msg)
        else:
            await update_job_status(ctx, job_id, "retrying", error=error_msg)
            raise
        return {"error": error_msg}

async def bulk_match_candidates(ctx: Dict[str, Any], target_job_id: str) -> Dict[str, Any]:
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "in_progress", progress=5)
        async with async_session_maker() as session:
            from src.db.models import Job
            db_job = await session.get(Job, UUID(target_job_id))
            if not db_job:
                raise ValueError(f"Job {target_job_id} not found")
            res = await session.execute(select(Candidate).where(Candidate.resume_text.is_not(None)))
            candidates = res.scalars().all()
            total_candidates = len(candidates)
            matches_count = 0
            for i, cand in enumerate(candidates):
                progress = int(10 + (i / max(total_candidates, 1)) * 85)
                await update_job_status(ctx, job_id, "in_progress", progress=progress)
                try:
                    match_data = await ai_client.calculate_match(cand.resume_text, db_job.description)
                    match_res = MatchResult(
                        candidate_id=cand.id,
                        job_id=UUID(target_job_id),
                        overall_score=match_data.get("overall_score", 0.0),
                        skills_score=match_data.get("skills_score", 0.0),
                        experience_score=match_data.get("experience_score", 0.0),
                        reasoning=match_data.get("reasoning", "")
                    )
                    session.add(match_res)
                    matches_count += 1
                except Exception:
                    continue
            await session.commit()
        result = {"job_id": target_job_id, "total_matched": matches_count}
        await update_job_status(ctx, job_id, "completed", progress=100, result=result)
        return result
    except Exception as e:
        error_msg = str(e)
        job_try = ctx.get("job_try", 1)
        if job_try >= settings.job_max_retries:
            await move_to_dlq(ctx, job_id, error_msg)
            await update_job_status(ctx, job_id, "dead", error=error_msg)
        else:
            await update_job_status(ctx, job_id, "retrying", error=error_msg)
            raise
        return {"error": error_msg}

async def process_resumes_batch(ctx, resume_items: List[dict]):
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "processing", 5)
        extracted = []
        failed_ids = []
        for i, item in enumerate(resume_items):
            try:
                res = await ai_client.extract_text(item["file_url"], item["file_type"], item["resume_id"])
                raw_text = res.get("raw_text", "")
                if raw_text:
                    extracted.append({"resume_id": item["resume_id"], "raw_text": raw_text})
                else:
                    failed_ids.append(item["resume_id"])
            except Exception:
                failed_ids.append(item["resume_id"])
            progress = int(10 + (30 * (i + 1) / len(resume_items)))
            await update_job_status(ctx, job_id, "processing", progress)
        if not extracted:
            raise ValueError("No text extracted from any resume in batch")
        await update_job_status(ctx, job_id, "processing", 55)
        texts = [item["raw_text"] for item in extracted]
        try:
            embeddings = await ai_client.get_batch_embeddings(texts)
        except Exception:
            embeddings = []
            for text in texts:
                try:
                    embeddings.append(await ai_client.get_embeddings(text))
                except:
                    embeddings.append(None)
        await update_job_status(ctx, job_id, "processing", 80)
        async with async_session_maker() as session:
            for i, item in enumerate(extracted):
                resume_id = item["resume_id"]
                raw_text = item["raw_text"]
                embedding = embeddings[i] if i < len(embeddings) else None
                resume = await session.get(Resume, UUID(resume_id))
                if resume:
                    resume.raw_text = raw_text
                    resume.embedding = embedding
                try:
                    structured_res = await ai_client.structure_resume(raw_text, resume_id)
                    structured_data = structured_res.get("structured_data", {})
                    if structured_data:
                        full_name = (structured_data.get("full_name") or "").strip()
                        name_parts = full_name.split()
                        first_name = name_parts[0] if name_parts else "Unknown"
                        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
                        years_exp = calculate_years_experience(structured_data.get("experience", []))
                        parsed = ParsedResume(
                            resume_id=UUID(resume_id),
                            first_name=first_name,
                            last_name=last_name,
                            email=structured_data.get("email"),
                            phone=structured_data.get("phone"),
                            current_title=None,
                            current_company=None,
                            years_of_experience=years_exp,
                            skills=structured_data.get("skills", []),
                            location=structured_data.get("location"),
                            linkedin_url=structured_data.get("linkedin"),
                            github=structured_data.get("github"),
                            portfolio=structured_data.get("portfolio"),
                            summary=structured_data.get("summary"),
                            education=structured_data.get("education", []),
                            experience=structured_data.get("experience", []),
                            projects=structured_data.get("projects", []),
                            certifications=structured_data.get("certifications", []),
                            confidence_scores=structured_data.get("confidence_scores", {}),
                            confidence_score=structured_data.get("confidence_score"),
                            extraction_latency=structured_data.get("extraction_latency"),
                            json_data=structured_data
                        )
                        if structured_data.get("experience") and len(structured_data["experience"]) > 0:
                            parsed.current_title = structured_data["experience"][0].get("job_title")
                            parsed.current_company = structured_data["experience"][0].get("company")
                        session.add(parsed)
                        candidate = await session.get(Candidate, UUID(resume_id))
                        if candidate:
                            candidate.json_data = structured_data
                            candidate.resume_text = raw_text
                            candidate.embedding = embedding
                            if not candidate.first_name and first_name != "Unknown":
                                candidate.first_name = first_name
                            if not candidate.last_name and last_name:
                                candidate.last_name = last_name
                            if not candidate.skills and structured_data.get("skills"):
                                candidate.skills = structured_data.get("skills")
                except Exception:
                    pass
            await session.commit()
        await update_job_status(ctx, job_id, "completed", 100, result={"processed": len(extracted), "failed": len(failed_ids)})
    except Exception as e:
        await update_job_status(ctx, job_id, "failed", error=str(e))
        raise e

class WorkerSettings:
    functions = [process_resume, process_resumes_batch]
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
    job_timeout = 600
    max_tries = settings.job_max_retries