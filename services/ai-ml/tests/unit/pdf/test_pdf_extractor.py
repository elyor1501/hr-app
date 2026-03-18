import os
import sys
import pytest

# -------------------------------
# Add ai-ml/src to PYTHONPATH
# -------------------------------
PROJECT_ROOT = os.path.abspath(
    os.path.join(__file__, "../../../../..")
)
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")

sys.path.insert(0, SRC_ROOT)

from services.extractors.pdf.extractor import PDFExtractor

# -------------------------------
# Paths
# -------------------------------
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

PDF_ROOT = os.path.join(BASE_DIR, "pdfs", "Categories")


# -------------------------------
# Fixtures
# -------------------------------
@pytest.fixture(scope="module")
def extractor():
    return PDFExtractor()


# -------------------------------
# Tests
# -------------------------------

def test_text_pdf(extractor):
    """Text-based PDF should extract without OCR."""
    pdf = os.path.join(
        PDF_ROOT,
        "Accountant",
        "Accountant_multipage.pdf",
    )

    result = extractor.extract(pdf)

    assert result.error is None
    assert result.text.strip()
    assert result.time_taken < 5
    assert result.memory_mb < 500

    # At least one non-OCR page
    assert any(p.method in ("text", "structured") for p in result.pages)


def test_scanned_pdf_fallback(extractor):
    """Image-based PDF must invoke OCR."""
    pdf = os.path.join(
        PDF_ROOT,
        "Accountant",
        "Image_18 Accountant.pdf",
    )

    result = extractor.extract(pdf)

    assert result.error is None
    assert any(p.method == "ocr" for p in result.pages)


def test_multipage(extractor):
    """Multipage PDFs should return >1 page."""
    pdf = os.path.join(
        PDF_ROOT,
        "Advocate",
        "Advocate_multipage.pdf",
    )

    result = extractor.extract(pdf)

    assert result.error is None
    assert len(result.pages) > 1


def test_corrupted_pdf(extractor, tmp_path):
    """Broken PDF should not crash pipeline."""
    bad = tmp_path / "bad.pdf"
    bad.write_text("not a pdf at all")

    result = extractor.extract(str(bad))

    assert result.error is not None
    assert result.pages == []
    assert result.confidence == 0.0
