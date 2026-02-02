import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../../../.."))
SRC_ROOT = os.path.join(PROJECT_ROOT, "ai-ml", "src")

sys.path.insert(0, SRC_ROOT)

from services.extractors.docx.confidence import compute_docx_confidence
from services.extractors.docx.models import DocxBlock


def test_confidence_empty_blocks():
    assert compute_docx_confidence([]) == 0.0


def test_confidence_average():
    blocks = [
        DocxBlock(
            type="paragraph",
            text="hello",
            metadata={},
            confidence=0.5,
        ),
        DocxBlock(
            type="table",
            text="",
            metadata={"rows": [["a", "b"]]},
            confidence=0.9,
        ),
    ]

    result = compute_docx_confidence(blocks)

    assert result == 0.7
