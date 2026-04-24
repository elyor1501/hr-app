import asyncio
import json
import uuid as uuid_module
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import UUID
import structlog
from arq.connections import RedisSettings
from sqlalchemy import select, func, or_
from src.core.config import settings
from src.db.session import async_session_maker
from src.db.models import Resume, ParsedResume, Candidate, MatchResult, CandidateCV, StaffingRequest, RequestAuditLog
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
    if not isinstance(experience_list, list):
        return None
    total_months = 0
    current_year = datetime.utcnow().year
    for exp in experience_list:
        if not isinstance(exp, dict):
            continue
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


def _normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return "".join(c for c in phone if c.isdigit())


def _extract_name_from_raw_text(raw_text: str) -> tuple:
    if not raw_text:
        return "Unknown", ""
    lines = [line.strip() for line in raw_text.strip().split("\n") if line.strip()]
    for line in lines[:5]:
        if (
            len(line) > 2
            and len(line) < 80
            and "@" not in line
            and "http" not in line.lower()
            and not any(char.isdigit() for char in line[:3])
            and len(line.split()) >= 2
            and len(line.split()) <= 5
        ):
            name_parts = line.split()
            return name_parts[0], " ".join(name_parts[1:])
    return "Unknown", ""


async def _find_existing_candidate(session, structured_data: dict, first_name: str, last_name: str) -> Optional[Candidate]:
    candidate_email = structured_data.get("email")
    candidate_phone = _normalize_phone(structured_data.get("phone") or "")

    if candidate_email:
        result = await session.execute(
            select(Candidate).where(Candidate.email == candidate_email)
        )
        found = result.scalar_one_or_none()
        if found:
            logger.info("candidate_matched_by_email", email=candidate_email)
            return found

    if candidate_phone and len(candidate_phone) >= 7:
        all_candidates = await session.execute(
            select(Candidate).where(Candidate.phone.is_not(None))
        )
        for candidate in all_candidates.scalars().all():
            if candidate.phone:
                normalized = _normalize_phone(candidate.phone)
                if normalized and normalized == candidate_phone:
                    logger.info("candidate_matched_by_phone", phone=candidate_phone)
                    return candidate

    if first_name and first_name != "Unknown" and last_name:
        result = await session.execute(
            select(Candidate).where(
                Candidate.first_name == first_name,
                Candidate.last_name == last_name
            )
        )
        found = result.scalar_one_or_none()
        if found:
            logger.info("candidate_matched_by_name", first_name=first_name, last_name=last_name)
            return found

    return None


async def _link_cv_to_candidate(session, candidate: Candidate, resume: Resume) -> None:
    if not resume or not resume.file_url:
        return

    existing_cv_result = await session.execute(
        select(CandidateCV).where(
            CandidateCV.candidate_id == candidate.id,
            CandidateCV.file_url == resume.file_url
        )
    )
    if existing_cv_result.scalar_one_or_none():
        return

    existing_primary_result = await session.execute(
        select(CandidateCV).where(
            CandidateCV.candidate_id == candidate.id,
            CandidateCV.is_primary == True
        )
    )
    has_primary = existing_primary_result.scalar_one_or_none() is not None

    cv_count_result = await session.execute(
        select(func.count(CandidateCV.id)).where(
            CandidateCV.candidate_id == candidate.id
        )
    )
    cv_count = cv_count_result.scalar() or 0

    new_cv = CandidateCV(
        candidate_id=candidate.id,
        file_name=resume.file_name,
        file_url=resume.file_url,
        is_primary=(cv_count == 0 and not has_primary),
        file_size=None,
    )
    session.add(new_cv)
    logger.info("cv_linked_to_candidate", candidate_id=str(candidate.id), is_primary=(cv_count == 0 and not has_primary))


async def _auto_create_or_link_candidate(session, resume, structured_data, first_name, last_name, years_exp, raw_text, embedding, parsed):
    existing_candidate = await _find_existing_candidate(session, structured_data, first_name, last_name)

    if existing_candidate:
        existing_candidate.resume_text = raw_text
        existing_candidate.embedding = embedding
        existing_candidate.json_data = structured_data

        if not existing_candidate.skills and structured_data.get("skills"):
            existing_candidate.skills = structured_data.get("skills")
        if not existing_candidate.current_title and parsed.current_title:
            existing_candidate.current_title = parsed.current_title
        if not existing_candidate.current_company and parsed.current_company:
            existing_candidate.current_company = parsed.current_company
        if not existing_candidate.phone and structured_data.get("phone"):
            existing_candidate.phone = structured_data.get("phone")

        await _link_cv_to_candidate(session, existing_candidate, resume)

    else:
        if first_name == "Unknown":
            return

        candidate_email = structured_data.get("email")

        if not candidate_email or not candidate_email.strip() or "@" not in candidate_email:
            name_slug = f"{first_name.lower()}_{last_name.lower()}".replace(" ", "_")
            candidate_email = f"{name_slug}@noemail.vaspp.com"
            logger.info("creating_candidate_without_email", first_name=first_name, last_name=last_name)

        new_candidate = Candidate(
            first_name=first_name,
            last_name=last_name,
            email=candidate_email,
            phone=structured_data.get("phone"),
            current_title=parsed.current_title,
            current_company=parsed.current_company,
            years_of_experience=years_exp,
            skills=structured_data.get("skills", []),
            location=structured_data.get("location"),
            linkedin_url=structured_data.get("linkedin"),
            resume_text=raw_text,
            json_data=structured_data,
            embedding=embedding,
            status="active",
        )
        session.add(new_candidate)
        await session.flush()

        await _link_cv_to_candidate(session, new_candidate, resume)


async def _auto_create_staffing_request(session, doc_id: str, structured_data: dict, raw_text: str):
    try:
        existing = await session.execute(
            select(StaffingRequest).where(
                StaffingRequest.request_number.like(f"%{doc_id[:8]}%")
            )
        )
        if existing.scalar_one_or_none():
            return

        job_title = structured_data.get("job_title") or "Untitled Position"
        company_name = structured_data.get("company_name") or "Unknown Company"
        summary = structured_data.get("summary") or ""
        responsibilities = structured_data.get("responsibilities", [])

        if summary:
            job_description = summary
        elif responsibilities:
            job_description = "\n".join(responsibilities)
        else:
            job_description = raw_text[:2000] if raw_text else "No description available"

        unique_suffix = uuid_module.uuid4().hex[:6].upper()
        year = datetime.now().year
        request_number = f"REQ-{year}-{unique_suffix}"

        staffing_req = StaffingRequest(
            request_number=request_number,
            company_name=company_name,
            request_title=job_title,
            job_description=job_description,
            prepared_rate=None,
            final_rate=None,
            request_date=date.today(),
            proposed_date=None,
            customer_feedback=None,
            contract_status=False,
            state="open",
            created_by="system",
        )
        session.add(staffing_req)
        await session.flush()

        audit = RequestAuditLog(
            request_id=staffing_req.id,
            old_state=None,
            new_state="open",
            notes=f"Auto-created from requirement document {doc_id}",
        )
        session.add(audit)

        from sqlalchemy import text
        await session.execute(
            text("UPDATE requirement_documents SET staffing_request_id = :req_id WHERE id = :doc_id"),
            {"req_id": str(staffing_req.id), "doc_id": doc_id}
        )

        logger.info("auto_created_staffing_request", doc_id=doc_id, request_number=request_number, job_title=job_title)

    except Exception as e:
        logger.error("auto_create_staffing_request_failed", doc_id=doc_id, error=str(e))
        await session.rollback()


async def _process_single_resume(item: dict) -> dict:
    resume_id = item["resume_id"]
    file_url = item["file_url"]
    file_type = item["file_type"]

    try:
        extract_data = await ai_client.extract_text(file_url, file_type, resume_id)
        raw_text = extract_data.get("raw_text", "")

        if not raw_text:
            return {"resume_id": resume_id, "success": False, "error": "No text extracted"}

        embedding, structured_res = await asyncio.gather(
            ai_client.get_embeddings(raw_text),
            ai_client.structure_resume(raw_text, resume_id)
        )

        structured_data = structured_res.get("structured_data", {})

        return {
            "resume_id": resume_id,
            "raw_text": raw_text,
            "embedding": embedding,
            "structured_data": structured_data,
            "success": True,
        }

    except Exception as e:
        logger.error("single_resume_processing_failed", resume_id=resume_id, error=str(e))
        return {"resume_id": resume_id, "success": False, "error": str(e)}


def _resolve_name(structured_data: dict, raw_text: str) -> tuple:
    full_name = (structured_data.get("full_name") or "").strip()
    if not full_name and raw_text:
        full_name_fallback, last_fallback = _extract_name_from_raw_text(raw_text)
        if full_name_fallback != "Unknown":
            return full_name_fallback, last_fallback
    name_parts = full_name.split()
    first_name = name_parts[0] if name_parts else "Unknown"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    return first_name, last_name


async def process_resume(ctx: Dict[str, Any], resume_id: str, file_url: str, file_type: str) -> Dict[str, Any]:
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "in_progress", progress=10)

        result = await _process_single_resume({
            "resume_id": resume_id,
            "file_url": file_url,
            "file_type": file_type,
        })

        if not result.get("success"):
            raise Exception(result.get("error", "Processing failed"))

        raw_text = result["raw_text"]
        embedding = result["embedding"]
        structured_data = result["structured_data"]

        await update_job_status(ctx, job_id, "in_progress", progress=80)

        first_name, last_name = _resolve_name(structured_data, raw_text)
        years_exp = calculate_years_experience(structured_data.get("experience", []))

        async with async_session_maker() as session:
            resume = await session.get(Resume, UUID(resume_id))
            if resume:
                resume.raw_text = raw_text
                resume.embedding = embedding

            if structured_data is not None:
                existing_parsed_result = await session.execute(
                    select(ParsedResume).where(ParsedResume.resume_id == UUID(resume_id))
                )
                existing_parsed = existing_parsed_result.scalar_one_or_none()

                if not existing_parsed:
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
                else:
                    parsed = existing_parsed

                await _auto_create_or_link_candidate(
                    session, resume, structured_data,
                    first_name, last_name, years_exp,
                    raw_text, embedding, parsed
                )

            await session.commit()

        output = {"resume_id": resume_id, "text_length": len(raw_text), "embedding_generated": True}
        await update_job_status(ctx, job_id, "completed", progress=100, result=output)
        return output

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


async def process_requirement_doc(ctx: Dict[str, Any], doc_id: str, file_url: str, file_type: str) -> Dict[str, Any]:
    job_id = ctx.get("job_id")
    try:
        await update_job_status(ctx, job_id, "in_progress", progress=10)

        extract_data = await ai_client.extract_requirement_doc_text(file_url, file_type, doc_id)
        raw_text = extract_data.get("raw_text", "")

        if not raw_text:
            raise Exception("No text extracted from requirement document")

        await update_job_status(ctx, job_id, "in_progress", progress=40)

        embedding, structured_res = await asyncio.gather(
            ai_client.get_embeddings(raw_text),
            ai_client.structure_requirement_doc(raw_text, doc_id)
        )

        structured_data = structured_res.get("structured_data", {})

        await update_job_status(ctx, job_id, "in_progress", progress=75)

        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        async with async_session_maker() as session:
            from sqlalchemy import text
            await session.execute(
                text("""
                    UPDATE requirement_documents SET
                        raw_text = :raw_text,
                        structured_data = CAST(:structured_data AS jsonb),
                        embedding = CAST(:embedding AS vector),
                        job_title = :job_title,
                        required_skills = :required_skills,
                        preferred_skills = :preferred_skills,
                        tools_and_technologies = :tools_and_technologies,
                        experience_required = :experience_required,
                        employment_type = :employment_type,
                        work_mode = :work_mode,
                        processing_status = 'completed',
                        updated_at = NOW()
                    WHERE id = :doc_id
                """),
                {
                    "raw_text": raw_text,
                    "structured_data": json.dumps(structured_data),
                    "embedding": embedding_str,
                    "job_title": structured_data.get("job_title"),
                    "required_skills": structured_data.get("required_skills", []),
                    "preferred_skills": structured_data.get("preferred_skills", []),
                    "tools_and_technologies": structured_data.get("tools_and_technologies", []),
                    "experience_required": structured_data.get("experience_required"),
                    "employment_type": structured_data.get("employment_type"),
                    "work_mode": structured_data.get("work_mode"),
                    "doc_id": doc_id,
                }
            )
            await session.commit()

        async with async_session_maker() as session:
            await _auto_create_staffing_request(session, doc_id, structured_data, raw_text)
            await session.commit()

        output = {
            "doc_id": doc_id,
            "text_length": len(raw_text),
            "embedding_generated": True,
            "job_title": structured_data.get("job_title"),
            "staffing_request_created": True,
        }
        await update_job_status(ctx, job_id, "completed", progress=100, result=output)
        return output

    except Exception as e:
        error_msg = str(e)
        logger.error("process_requirement_doc_failed", job_id=job_id, error=error_msg)

        async with async_session_maker() as session:
            from sqlalchemy import text
            await session.execute(
                text("UPDATE requirement_documents SET processing_status = 'failed', updated_at = NOW() WHERE id = :doc_id"),
                {"doc_id": doc_id}
            )
            await session.commit()

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

        tasks = [_process_single_resume(item) for item in resume_items]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        await update_job_status(ctx, job_id, "processing", 70)

        processed = 0
        failed = 0

        async with async_session_maker() as session:
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error("batch_item_failed", error=str(result))
                    failed += 1
                    continue

                if not result.get("success"):
                    failed += 1
                    continue

                resume_id = result["resume_id"]
                raw_text = result["raw_text"]
                embedding = result["embedding"]
                structured_data = result["structured_data"]

                try:
                    resume = await session.get(Resume, UUID(resume_id))
                    if resume:
                        resume.raw_text = raw_text
                        resume.embedding = embedding

                    if structured_data is not None:
                        first_name, last_name = _resolve_name(structured_data, raw_text)
                        years_exp = calculate_years_experience(structured_data.get("experience", []))

                        existing_parsed_result = await session.execute(
                            select(ParsedResume).where(ParsedResume.resume_id == UUID(resume_id))
                        )
                        existing_parsed = existing_parsed_result.scalar_one_or_none()

                        if not existing_parsed:
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
                        else:
                            parsed = existing_parsed

                        await _auto_create_or_link_candidate(
                            session, resume, structured_data,
                            first_name, last_name, years_exp,
                            raw_text, embedding, parsed
                        )

                    processed += 1

                except Exception as e:
                    logger.error("batch_db_save_failed", resume_id=resume_id, error=str(e))
                    failed += 1

            await session.commit()

        await update_job_status(ctx, job_id, "completed", 100, result={"processed": processed, "failed": failed})

    except Exception as e:
        await update_job_status(ctx, job_id, "failed", error=str(e))
        raise e


class WorkerSettings:
    functions = [process_resume, process_resumes_batch, process_requirement_doc]
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
    job_timeout = 600
    max_tries = settings.job_max_retries