import os
import sys
from pathlib import Path

PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../../../.."))
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")

sys.path.insert(0, SRC_ROOT)

from services.extractors.docx.extractor import DOCXExtractor


BASE_DIR = Path(__file__).parents[3]
DOCX_ROOT = BASE_DIR / "tests" / "docx_samples"


def test_headers_and_footers_present():
    extractor = DOCXExtractor()

    doc = DOCX_ROOT / "headers.docx"

    result = extractor.extract(str(doc))

    assert any(b.type == "header" for b in result.blocks)
    assert any(b.type == "footer" for b in result.blocks)
