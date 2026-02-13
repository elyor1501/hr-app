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

async def upload_file(file: UploadFile) -> str:
    """Uploads file to Supabase and returns the public URL."""
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