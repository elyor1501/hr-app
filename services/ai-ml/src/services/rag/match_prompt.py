import json


def build_match_prompt(job_description: str, structured_cv: dict, retrieved_chunks: list):

    if retrieved_chunks:
        context_block = "\n\n".join(
            [
                f"Chunk {i+1} (Source: {item['source_file']}):\n{item['text_chunk']}"
                for i, item in enumerate(retrieved_chunks)
            ]
        )
    else:
        context_block = "No additional resume context available."

    skills = structured_cv.get("skills", [])
    if isinstance(skills, list):
        skills_str = ", ".join(skills[:30])
    else:
        skills_str = str(skills)

    experience = structured_cv.get("experience", [])
    exp_summary = ""
    if isinstance(experience, list):
        for exp in experience[:3]:
            if isinstance(exp, dict):
                title = exp.get("job_title", "N/A")
                company = exp.get("company", "N/A")
                start = exp.get("start_date", "")
                end = exp.get("end_date", "")
                exp_summary += f"- {title} at {company} ({start} - {end})\n"

    education = structured_cv.get("education", [])
    edu_summary = ""
    if isinstance(education, list):
        for edu in education[:3]:
            if isinstance(edu, dict):
                degree = edu.get("degree", "N/A")
                school = edu.get("institution", "N/A")
                edu_summary += f"- {degree} from {school}\n"

    candidate_name = structured_cv.get("name") or structured_cv.get("full_name") or "Unknown"
    summary = structured_cv.get("summary", "Not provided")
    location = structured_cv.get("location", "Not specified")

    return f"""You are an expert HR analyst. Evaluate how well the candidate matches the job.

### JOB DESCRIPTION:
{job_description}

### CANDIDATE: {candidate_name}
Location: {location}
Summary: {summary}
Skills: {skills_str}

Experience:
{exp_summary if exp_summary else "Not provided"}

Education:
{edu_summary if edu_summary else "Not provided"}

### ADDITIONAL CONTEXT:
{context_block}

Evaluate match score (0-100), strengths, gaps, and recommendations.

Return ONLY valid JSON:
{{"match_score": 0, "reasoning": "", "strengths": [], "gaps": [], "recommendations": []}}"""