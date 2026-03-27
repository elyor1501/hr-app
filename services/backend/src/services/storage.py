import os
import uuid
from fastapi import UploadFile
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

BUCKET_NAME = "resumes"

async def upload_file_bytes(content: bytes, filename: str, content_type: str = None) -> str:
    if not supabase:
        print("Supabase not configured")
        return None

    try:
        file_ext = filename.split(".")[-1] if "." in filename else "pdf"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        
        if not content_type:
            content_type = "application/pdf"

        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=content,
            file_options={"content-type": content_type}
        )

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        return public_url
    except Exception as e:
        print(f"Upload failed: {e}")
        return None

async def upload_file(file: UploadFile) -> str:
    if not supabase:
        print("Supabase not configured")
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

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        return public_url
    except Exception as e:
        print(f"Upload failed: {e}")
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