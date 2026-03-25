class PDFExtractionError(Exception):
    """Base exception for PDF extraction errors"""

    def __init__(self, message: str, stage: str):
        super().__init__(message)
        self.message = message
        self.stage = stage


class CorruptedPDFError(PDFExtractionError):
    """Raised when PDF cannot be read or is corrupted"""

    def __init__(self, message: str):
        super().__init__(message, stage="pypdf_read")
