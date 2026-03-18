import os
import sys
import pytest
from pathlib import Path

PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../../../.."))
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")

sys.path.insert(0, SRC_ROOT)

from services.extractors.docx.extractor import DOCXExtractor


BASE_DIR = Path(__file__).parents[3]
DOCX_ROOT = BASE_DIR / "tests" / "docx_samples"


@pytest.fixture(scope="module")
def extractor():
    return DOCXExtractor()


def test_basic_docx_extraction(extractor):
    doc = DOCX_ROOT / "simple.docx"

    result = extractor.extract(str(doc))

    assert result.error is None
    assert result.text.strip()
    assert result.time_taken < 2
    assert result.memory_mb < 500
    assert len(result.blocks) > 0
    assert result.confidence > 0.5


def test_tables_are_extracted(extractor):
    doc = DOCX_ROOT / "tables.docx"

    result = extractor.extract(str(doc))

    assert any(b.type == "table" for b in result.blocks)


def test_headers_and_footers(extractor):
    doc = DOCX_ROOT / "headers.docx"

    result = extractor.extract(str(doc))

    assert any(b.type in ("header", "footer") for b in result.blocks)


def test_unicode_preserved(extractor):
    doc = DOCX_ROOT / "unicode.docx"

    result = extractor.extract(str(doc))

    assert "₹" in result.text or "é" in result.text


def test_empty_docx(extractor):
    doc = DOCX_ROOT / "empty.docx"

    result = extractor.extract(str(doc))

    assert result.error is None
    assert result.blocks == []
    assert result.confidence == 0.0
