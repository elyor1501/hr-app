import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../../../.."))
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")
sys.path.insert(0, SRC_ROOT)

from services.extractors.pdf.confidence import compute_overall_confidence
from services.extractors.pdf.models import PageExtraction


def test_confidence_empty_pages():
    assert compute_overall_confidence([]) == 0.0


def test_confidence_average():
    pages = [
        PageExtraction(1, "a", "text", 0.5),
        PageExtraction(2, "b", "ocr", 0.9),
    ]

    result = compute_overall_confidence(pages)

    assert result == 0.7
