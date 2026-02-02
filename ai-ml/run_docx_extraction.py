import os
import sys
import json
import traceback
from pathlib import Path

# PATH SETUP

BASE_DIR = Path(__file__).resolve().parent
SRC_ROOT = BASE_DIR / "src"

sys.path.insert(0, str(SRC_ROOT))

from services.extractors.docx.extractor import DOCXExtractor


# CONFIG
INPUT_ROOT = BASE_DIR / "tests" / "docx"
OUTPUT_ROOT = BASE_DIR / "tests" / "output_docx"

OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)


extractor = DOCXExtractor()

# MAIN

def main():

    print(">>> DOCX batch extraction started")
    print("INPUT_ROOT =", INPUT_ROOT)

    docx_files = list(INPUT_ROOT.glob("*.docx"))

    print("TOTAL DOCX FILES:", len(docx_files))

    success = 0
    failed = 0

    for docx_path in docx_files:

        print("Processing:", docx_path)

        try:
            result = extractor.extract(str(docx_path))

            output_data = {
                "file_name": docx_path.name,
                "total_blocks": len(result.blocks),
                "confidence": result.confidence,
                "time_taken": result.time_taken,
                "memory_mb": result.memory_mb,
                "blocks": [
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

            success += 1

        except Exception as exc:

            traceback.print_exc()

            output_data = {
                "file_name": docx_path.name,
                "total_blocks": 0,
                "confidence": 0.0,
                "time_taken": 0.0,
                "memory_mb": 0.0,
                "blocks": [],
                "error": {
                    "message": str(exc),
                    "stage": "batch_loop_exception",
                },
            }

            failed += 1

        output_file = OUTPUT_ROOT / docx_path.name.replace(".docx", ".json")

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print("Saved →", output_file)

    print("\n>>> DOCX batch extraction finished")
    print("SUCCESS:", success)
    print("FAILED :", failed)
    print("TOTAL  :", len(docx_files))


if __name__ == "__main__":
    main()
