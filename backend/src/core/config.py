from functools import lru_cache

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
