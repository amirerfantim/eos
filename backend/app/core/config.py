"""Application settings, loaded from environment variables (12-factor).

Values come from the process environment or an optional `.env` file. In Docker
they are injected via `env_file` / `environment` in docker-compose.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the Eos backend."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Async SQLAlchemy URL. Default targets the `db` service in docker-compose.
    database_url: str = "postgresql+asyncpg://eos:eos@db:5432/eos"

    # Path prefix for the versioned REST API.
    api_v1_prefix: str = "/api/v1"

    # Origins allowed to call the API from a browser (the Vite dev server).
    # Override with a JSON list in the CORS_ORIGINS env var if needed.
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Human-facing metadata surfaced in the OpenAPI docs.
    app_name: str = "Eos API"
    app_version: str = "0.1.0"


# Single shared settings instance imported across the app.
settings = Settings()
