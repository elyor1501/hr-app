from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Environment
    environment: str = Field(default="development")

    # AI Provider Keys (never log these)
    openai_api_key: str | None = Field(default=None, env="OPENAI_API_KEY")
    gemini_api_key: str | None = Field(default=None, env="GEMINI_API_KEY")

    # Timeouts (seconds)
    request_timeout: int = Field(default=30, env="REQUEST_TIMEOUT")

    # Service metadata
    service_name: str = "ai-ml-service"
    service_port: int = 8001

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton settings object
settings = Settings()
