from pathlib import Path

from services.extractors.docx.extractor import DOCXExtractor

SAMPLES = Path(__file__).parents[2] / "docx_sample"

extractor = DOCXExtractor()


def test_corrupted_random_bytes():
    path = SAMPLES / "corrupted_random_bytes.docx"
    result = extractor.extract(str(path))

    assert result.error is not None
    assert result.blocks == []


def test_corrupted_broken_zip():
    path = SAMPLES / "corrupted_broken_zip.docx"
    result = extractor.extract(str(path))

    assert result.error is not None
    assert result.blocks == []


def test_corrupted_missing_core_xml():
    path = SAMPLES / "corrupted_missing_core_xml.docx"
    result = extractor.extract(str(path))

    assert result.error is not None
    assert result.blocks == []
