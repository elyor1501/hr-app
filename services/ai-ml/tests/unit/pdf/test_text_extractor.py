import os
import sys
import pytest
from pathlib import Path

PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../../../.."))
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")
sys.path.insert(0, SRC_ROOT)

from services.extractors.pdf.text_extractor import TextPDFExtractor
from services.extractors.pdf.exceptions import CorruptedPDFError


PDF_DIR = Path(__file__).parents[3] / "tests" / "pdfs" / "Categories"



def test_text_extractor_success():
    extractor = TextPDFExtractor()

    pdf = PDF_DIR / "Accountant" / "Accountant_multipage.pdf"

    pages = extractor.extract(str(pdf))

    assert pages
    assert pages[0].text
    assert pages[0].method == "text"
    assert pages[0].confidence > 0


def test_text_extractor_corrupted(tmp_path):
    bad = tmp_path / "bad.pdf"
    bad.write_text("not a real pdf")

    extractor = TextPDFExtractor()

    with pytest.raises(CorruptedPDFError):
        extractor.extract(str(bad))


def test_cleaning_removes_bad_chars(monkeypatch):
    extractor = TextPDFExtractor()

    class FakePage:
        def extract_text(self, extraction_mode=None):
            return "hello\u00a0world¢"

    class FakeReader:
        pages = [FakePage()]

    monkeypatch.setattr(
        "services.extractors.pdf.text_extractor.PdfReader",
        lambda _: FakeReader(),
    )

    pages = extractor.extract("fake.pdf")

    assert "•" in pages[0].text
    assert "\u00a0" not in pages[0].text
