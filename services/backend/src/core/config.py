from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    """

    app_name: str = Field(default="hr-app-backend")
    environment: str = Field(default="development")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    cors_origins: list[str] = Field(default_factory=list)

    log_level: str = Field(default="INFO")
    # AI/ML Service Settings
    ai_service_url: str = Field(default="http://ai-service:8080")
    ai_service_timeout: int = Field(default=30)
    ai_service_max_retries: int = Field(default=3)
    ai_service_circuit_breaker_threshold: int = Field(default=5)

    # Database settings
    database_host: str = Field(default="localhost")
    database_port: int = Field(default=5432)
    database_user: str = Field(default="postgres")
    database_password: str = Field(default="postgres")
    database_name: str = Field(default="hr_app")

    # Connection pool settings
    database_pool_size: int = Field(default=5)
    database_max_overflow: int = Field(default=10)
    database_pool_timeout: int = Field(default=30)

    # Auth Settings
    jwt_secret_key: str = Field(default="super-secret-key-change-in-production")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=7)

    # Redis settings
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)

    # Vector dimension (768 for Gemini, 1536 for OpenAI)
    vector_dimension: int = Field(default=768)

    @property
    def database_url(self) -> str:
        """Construct async database URL with properly encoded password."""
        encoded_password = quote_plus(self.database_password)
        return (
            f"postgresql+asyncpg://{self.database_user}:{encoded_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    @property
    def database_url_sync(self) -> str:
        """Construct sync database URL for migrations."""
        encoded_password = quote_plus(self.database_password)
        return (
            f"postgresql://{self.database_user}:{encoded_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    model_config = SettingsConfigDict(
        env_prefix="HR_APP_",
        env_file=".env",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings instance to avoid reloading env vars.
    """
    return Settings()


settings = get_settings()