import os
import sys
import json
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

from src.services.extractors.pdf.extractor import PDFExtractor

# CONFIG
MAX_WORKERS = 4
TIMEOUT_PER_PDF = 60  


sys.path.append(os.path.abspath("src"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_ROOT = os.path.join(BASE_DIR, "tests", "pdfs", "Categories")
OUTPUT_ROOT = os.path.join(BASE_DIR, "tests", "output")

os.makedirs(OUTPUT_ROOT, exist_ok=True)

extractor = PDFExtractor()


def safe_process_pdf(category: str, pdf_name: str):

    pdf_path = os.path.join(INPUT_ROOT, category, pdf_name)

    print("Processing:", pdf_path)

    try:
        result = extractor.extract(pdf_path)

        return {
            "category": category,
            "file_name": pdf_name,
            "total_pages": len(result.pages),
            "confidence": result.confidence,
            "time_taken": result.time_taken,
            "memory_mb": result.memory_mb,
            "pages": [
                {
                    "page_number": p.page_number,
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

    except Exception as exc:

        traceback.print_exc()

        return {
            "category": category,
            "file_name": pdf_name,
            "total_pages": 0,
            "confidence": 0.0,
            "time_taken": 0.0,
            "memory_mb": 0.0,
            "pages": [],
            "error": {
                "message": str(exc),
                "stage": "batch_worker",
            },
        }


def main():

    print(">>> Script started")
    print("INPUT_ROOT =", INPUT_ROOT)

    jobs = []

    for category in os.listdir(INPUT_ROOT):

        cat_path = os.path.join(INPUT_ROOT, category)

        if not os.path.isdir(cat_path):
            continue

        for pdf_name in os.listdir(cat_path):

            if pdf_name.lower().endswith(".pdf"):
                jobs.append((category, pdf_name))

    print("TOTAL PDFs:", len(jobs))

    futures = {}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:

        for category, pdf_name in jobs:
            fut = executor.submit(
                safe_process_pdf,
                category,
                pdf_name,
            )
            futures[fut] = (category, pdf_name)

        for future in as_completed(futures):

            category, pdf_name = futures[future]

            try:
                output_data = future.result(timeout=TIMEOUT_PER_PDF)

            except TimeoutError:

                print("⏱ TIMEOUT:", pdf_name)

                output_data = {
                    "category": category,
                    "file_name": pdf_name,
                    "total_pages": 0,
                    "confidence": 0.0,
                    "time_taken": TIMEOUT_PER_PDF,
                    "memory_mb": 0.0,
                    "pages": [],
                    "error": {
                        "message": "Timeout exceeded",
                        "stage": "batch_timeout",
                    },
                }

            output_file = os.path.join(
                OUTPUT_ROOT,
                f"{category}_{pdf_name.replace('.pdf','')}.json",
            )

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)

            print("Saved →", output_file)


if __name__ == "__main__":
    main()
