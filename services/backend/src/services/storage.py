import os
import uuid
from fastapi import UploadFile
from supabase import create_client, Client

from src.core.config import settings

SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_service_key

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

BUCKET_NAME = "resumes"
REQUIREMENT_DOCS_BUCKET = "requirement-docs"


async def upload_file(file: UploadFile) -> str:
    if not supabase:
        return None
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        return supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
    except Exception as e:
        print(f"Upload failed: {e}")
        return None


async def upload_requirement_doc(file: UploadFile) -> str:
    if not supabase:
        return None
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        supabase.storage.from_(REQUIREMENT_DOCS_BUCKET).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type or "application/octet-stream"}
        )
        return supabase.storage.from_(REQUIREMENT_DOCS_BUCKET).get_public_url(file_path)
    except Exception as e:
        print(f"Requirement doc upload failed: {e}")
        return None


async def delete_file_from_storage(file_url: str) -> bool:
    if not supabase or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{BUCKET_NAME}/")[-1]
        supabase.storage.from_(BUCKET_NAME).remove([file_path])
        return True
    except Exception as e:
        print(f"Delete failed: {e}")
        return False


async def delete_requirement_doc_from_storage(file_url: str) -> bool:
    if not supabase or not file_url:
        return False
    try:
        file_path = file_url.split(f"/{REQUIREMENT_DOCS_BUCKET}/")[-1]
        supabase.storage.from_(REQUIREMENT_DOCS_BUCKET).remove([file_path])
        return True
    except Exception as e:
        print(f"Requirement doc delete failed: {e}")
        return False