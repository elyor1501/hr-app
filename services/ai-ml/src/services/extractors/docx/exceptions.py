class DocxExtractionError(Exception):
    """Base exception for DOCX extraction errors"""

    def __init__(self, message: str, stage: str):
        super().__init__(message)
        self.message = message
        self.stage = stage


class UnsupportedDocxFormatError(DocxExtractionError):
    """Raised when non-docx file is passed"""

    def __init__(self, message: str):
        super().__init__(message, stage="unsupported_format")


class CorruptedDocxError(DocxExtractionError):
    """Raised when DOCX cannot be read"""

    def __init__(self, message: str):
        super().__init__(message, stage="python_docx_read")
