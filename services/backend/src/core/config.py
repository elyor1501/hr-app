from functools import lru_cache
from typing import List, Optional
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="hr-app-backend")
    environment: str = Field(default="development")
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    cors_origins: List[str] = Field(default_factory=list)
    log_level: str = Field(default="INFO")

    ai_service_url: str = Field(default="http://ai-ml-service:8001")
    ai_service_timeout: int = Field(default=30)
    ai_service_max_retries: int = Field(default=3)
    ai_service_circuit_breaker_threshold: int = Field(default=5)

    database_host: str = Field(default="localhost")
    database_port: int = Field(default=5432)
    database_user: str = Field(default="postgres")
    database_password: str = Field(default="postgres")
    database_name: str = Field(default="hr_app")
    database_pool_size: int = Field(default=5)
    database_max_overflow: int = Field(default=10)
    database_pool_timeout: int = Field(default=30)

    jwt_secret_key: str = Field(default="super-secret-key-change-in-production")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=7)

    redis_host: str = Field(default="redis")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)

    vector_dimension: int = Field(default=768)

    rate_limit_enabled: bool = Field(default=True)
    rate_limit_auth_requests: int = Field(default=10)
    rate_limit_auth_window: int = Field(default=60)
    rate_limit_search_requests: int = Field(default=30)
    rate_limit_search_window: int = Field(default=60)
    rate_limit_crud_requests: int = Field(default=60)
    rate_limit_crud_window: int = Field(default=60)

    cache_enabled: bool = Field(default=True)
    cache_search_ttl: int = Field(default=300)
    cache_detail_ttl: int = Field(default=600)
    cache_match_ttl: int = Field(default=3600)
    cache_prefix: str = Field(default="hr_app")

    job_max_retries: int = Field(default=3)
    job_timeout: int = Field(default=300)
    job_result_ttl: int = Field(default=3600)

    log_request_body: bool = Field(default=False)
    log_response_body: bool = Field(default=False)
    log_sensitive_fields: List[str] = Field(
        default_factory=lambda: ["password", "token", "secret", "authorization"]
    )

    supabase_url: Optional[str] = Field(default=None)
    supabase_service_key: Optional[str] = Field(default=None)
    database_url: Optional[str] = Field(default=None)

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        
        encoded_password = quote_plus(self.database_password)
        base = f"postgresql+asyncpg://{self.database_user}:{encoded_password}@{self.database_host}:{self.database_port}/{self.database_name}"
        return base

    @property
    def database_url_sync(self) -> str:
        if self.database_url:
            return self.database_url.replace("+asyncpg", "").split("?")[0]
        encoded_password = quote_plus(self.database_password)
        return f"postgresql://{self.database_user}:{encoded_password}@{self.database_host}:{self.database_port}/{self.database_name}"

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    model_config = SettingsConfigDict(
        env_prefix="HR_APP_",
        env_file=".env",
        case_sensitive=False,
        extra="allow"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()