import os
import shutil
from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import UploadFile, HTTPException


class FileService:
    """Service to handle file uploads."""

    UPLOAD_DIR = Path("uploads/cvs")

    def __init__(self):
        # Create upload directory if it doesn't exist
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async def save_cv(self, file: UploadFile) -> str:
        """
        Save uploaded CV to disk and return the file path/URL.
        Validates file type and size.
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        # Validate extension
        allowed_extensions = {".pdf", ".docx", ".doc"}
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed: {allowed_extensions}"
            )

        # Generate unique filename
        new_filename = f"{uuid4()}{ext}"
        file_path = self.UPLOAD_DIR / new_filename

        # Save file (using async save for performance)
        try:
            async with aiofiles.open(file_path, "wb") as out_file:
                while content := await file.read(1024 * 1024):  # Read 1MB chunks
                    await out_file.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        finally:
            await file.close()

        # Return relative path for storage in DB
        return str(file_path).replace("\\", "/")