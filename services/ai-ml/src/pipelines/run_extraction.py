import sys
import json
import traceback
from pathlib import Path
from concurrent.futures import (
    ProcessPoolExecutor,
    as_completed,
    TimeoutError,
)


# PATH SETUP

BASE_DIR = Path(__file__).resolve().parents[2]
SRC_DIR = BASE_DIR / "src"

sys.path.insert(0, str(SRC_DIR))

# IMPORT EXTRACTORS

from services.extractors.pdf import extract_pdf
from services.extractors.docx import extract_docx


# CONFIG

MAX_WORKERS = 2          # safer for OCR on Windows
TIMEOUT_PER_FILE = 300  # seconds

DATA_DIR = SRC_DIR / "data"
INPUT_DIR = DATA_DIR / "input"
OUTPUT_DIR = DATA_DIR / "output"

PDF_OUT = OUTPUT_DIR / "pdf"
DOCX_OUT = OUTPUT_DIR / "docx"
FAILED_OUT = OUTPUT_DIR / "failed"

SUPPORTED_EXTENSIONS = {".pdf", ".docx"}

for d in [PDF_OUT, DOCX_OUT, FAILED_OUT]:
    d.mkdir(parents=True, exist_ok=True)


# FILE DISCOVERY (DEDUPLICATED)

def discover_files(root: Path):

    seen = set()
    files = []

    for p in root.rglob("*"):

        if not p.is_file():
            continue

        if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        resolved = p.resolve()

        if resolved in seen:
            continue

        seen.add(resolved)
        files.append(resolved)

    return files

# RESULT NORMALIZERS

def normalize_pdf_result(result, file_path: Path):

    return {
        "file_name": file_path.name,
        "file_type": "pdf",
        "confidence": result.confidence,
        "time_taken": result.time_taken,
        "memory_mb": result.memory_mb,
        "units": [
            {
                "index": p.page_number,
                "method": p.method,
                "confidence": p.confidence,
                "text": p.text,
            }
            for p in result.pages
        ],
        "error": (
            {
                "message": result.error.message,
                "stage": result.error.stage,
            }
            if result.error
            else None
        ),
    }


def normalize_docx_result(result, file_path: Path):

    return {
        "file_name": file_path.name,
        "file_type": "docx",
        "confidence": result.confidence,
        "time_taken": result.time_taken,
        "memory_mb": result.memory_mb,
        "units": [
            {
                "type": b.type,
                "text": b.text,
                "confidence": b.confidence,
                "metadata": b.metadata,
            }
            for b in result.blocks
        ],
        "error": (
            {
                "message": result.error.message,
                "stage": result.error.stage,
            }
            if result.error
            else None
        ),
    }

def process_file(path: Path):

    print("Processing:", path)

    try:

        if path.suffix.lower() == ".pdf":

            result = extract_pdf(str(path))
            data = normalize_pdf_result(result, path)
            out_root = PDF_OUT

        elif path.suffix.lower() == ".docx":

            result = extract_docx(str(path))
            data = normalize_docx_result(result, path)
            out_root = DOCX_OUT

        else:
            raise ValueError("Unsupported file type")

        return out_root, data, path

    except Exception as exc:

        traceback.print_exc()

        return (
            FAILED_OUT,
            {
                "file_name": path.name,
                "file_type": path.suffix.replace(".", ""),
                "confidence": 0.0,
                "time_taken": 0.0,
                "memory_mb": 0.0,
                "units": [],
                "error": {
                    "message": str(exc),
                    "stage": "orchestrator_exception",
                },
            },
            path,
        )

def main():

    print("\n>>> Unified extraction pipeline started")
    print("INPUT_DIR :", INPUT_DIR)
    print("OUTPUT_DIR:", OUTPUT_DIR)

    files = discover_files(INPUT_DIR)

    pdf_count = len([f for f in files if f.suffix.lower() == ".pdf"])
    docx_count = len([f for f in files if f.suffix.lower() == ".docx"])

    print(f"PDFs found : {pdf_count}")
    print(f"DOCXs found: {docx_count}")
    print(f"TOTAL FILES: {len(files)}")

    if not files:
        print("⚠ No input files found.")
        return

    success = 0
    failed = 0
    completed = 0

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:

        futures = {
            executor.submit(process_file, f): f
            for f in files
        }

        for future in as_completed(futures):

            path = futures[future]

            try:

                out_root, data, path = future.result(
                    timeout=TIMEOUT_PER_FILE
                )

            except TimeoutError:

                print("⏱ TIMEOUT:", path)

                out_root = FAILED_OUT

                data = {
                    "file_name": path.name,
                    "file_type": path.suffix.replace(".", ""),
                    "confidence": 0.0,
                    "time_taken": TIMEOUT_PER_FILE,
                    "memory_mb": 0.0,
                    "units": [],
                    "error": {
                        "message": "Processing timeout exceeded",
                        "stage": "orchestrator_timeout",
                    },
                }

                failed += 1

            # Preserve relative structure to avoid collisions
            relative = path.relative_to(INPUT_DIR)

            safe_name = "__".join(relative.parts).replace(
                path.suffix,
                ".json",
            )

            out_file = out_root / safe_name
            out_file.parent.mkdir(parents=True, exist_ok=True)

            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            print("Saved →", out_file)

            if data.get("error"):
                failed += 1
            else:
                success += 1

            completed += 1
            print(f"Progress: {completed}/{len(files)}")

    print("\n>>> Extraction finished")
    print("SUCCESS:", success)
    print("FAILED :", failed)
    print("TOTAL  :", len(files))


if __name__ == "__main__":
    main()
