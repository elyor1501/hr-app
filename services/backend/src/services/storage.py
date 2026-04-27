import os
import uuid
import asyncio
import httpx
from fastapi import UploadFile

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

BUCKET_NAME = "resumes"
REQUIREMENT_DOCS_BUCKET = "requirement-docs"
CANDIDATE_CVS_BUCKET = "candidate-cvs"
CANDIDATE_ATTACHMENTS_BUCKET = "candidate-attachments"

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    from supabase import create_client, Client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

_http_client: httpx.AsyncClient = None


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _http_client


def _get_public_url(bucket: str, file_path: str) -> str:
    base = SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{file_path}"


async def _upload_async(bucket: str, file_path: str, file_content: bytes, content_type: str) -> str:
    client = await _get_http_client()
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "false",
    }
    response = await client.post(url, content=file_content, headers=headers)
    if response.status_code not in (200, 201):
        raise Exception(f"Upload failed: {response.status_code} {response.text}")
    return _get_public_url(bucket, file_path)


async def _delete_async(bucket: str, file_path: str):
    client = await _get_http_client()
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    await client.delete(url, headers=headers)


async def upload_file(file: UploadFile) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        return await _upload_async(BUCKET_NAME, file_path, file_content, file.content_type or "application/octet-stream")
    except Exception as e:
        print(f"Upload failed: {e}")
        return None


async def upload_file_bytes(file_content: bytes, filename: str, content_type: str) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_ext = filename.split(".")[-1].lower() if "." in filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        return await _upload_async(BUCKET_NAME, file_path, file_content, content_type or "application/octet-stream")
    except Exception as e:
        print(f"Upload failed: {e}")
        return None


async def upload_requirement_doc(file: UploadFile) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        return await _upload_async(REQUIREMENT_DOCS_BUCKET, file_path, file_content, file.content_type or "application/octet-stream")
    except Exception as e:
        print(f"Requirement doc upload failed: {e}")
        return None


async def upload_candidate_cv(file: UploadFile) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        return await _upload_async(CANDIDATE_CVS_BUCKET, file_path, file_content, file.content_type or "application/octet-stream")
    except Exception as e:
        print(f"Candidate CV upload failed: {e}")
        return None


async def upload_candidate_attachment(file: UploadFile) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_content = await file.read()
        file.file.seek(0)
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        return await _upload_async(CANDIDATE_ATTACHMENTS_BUCKET, file_path, file_content, file.content_type or "application/octet-stream")
    except Exception as e:
        print(f"Candidate attachment upload failed: {e}")
        return None


async def delete_file_from_storage(file_url: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{BUCKET_NAME}/")[-1].split("?")[0]
        await _delete_async(BUCKET_NAME, file_path)
        return True
    except Exception as e:
        print(f"Delete failed: {e}")
        return False


async def delete_requirement_doc_from_storage(file_url: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{REQUIREMENT_DOCS_BUCKET}/")[-1].split("?")[0]
        await _delete_async(REQUIREMENT_DOCS_BUCKET, file_path)
        return True
    except Exception as e:
        print(f"Requirement doc delete failed: {e}")
        return False


async def delete_candidate_cv_from_storage(file_url: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{CANDIDATE_CVS_BUCKET}/")[-1].split("?")[0]
        await _delete_async(CANDIDATE_CVS_BUCKET, file_path)
        return True
    except Exception as e:
        print(f"Candidate CV delete failed: {e}")
        return False


async def delete_candidate_attachment_from_storage(file_url: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{CANDIDATE_ATTACHMENTS_BUCKET}/")[-1].split("?")[0]
        await _delete_async(CANDIDATE_ATTACHMENTS_BUCKET, file_path)
        return True
    except Exception as e:
        print(f"Candidate attachment delete failed: {e}")
        return False