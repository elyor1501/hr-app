class EmbeddingServiceError(Exception):
    """Base class for embedding service errors."""


class GeminiEmbeddingError(EmbeddingServiceError):
    """Raised when Gemini embedding fails."""


class OpenAIEmbeddingError(EmbeddingServiceError):
    """Raised when OpenAI embedding fails."""


class RateLimitError(EmbeddingServiceError):
    """Raised when rate limit is exceeded."""
