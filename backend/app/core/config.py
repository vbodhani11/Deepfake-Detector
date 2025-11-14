import json
import secrets
from typing import Any
from pydantic import computed_field, field_validator
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[".env", ".env.local"],
        env_ignore_empty=True,
        extra="ignore",
    )

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Deepfake Detector API"
    ENVIRONMENT: str = "local"
    SENTRY_DSN: str | None = None

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    @computed_field(return_type=list[str])
    @property
    def all_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]

    # Database Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "deepfake_user"
    POSTGRES_PASSWORD: str = "changethis"
    POSTGRES_DB: str = "deepfake_detector"
    POSTGRES_SSL_MODE: str = "disable"

    @computed_field(return_type=MultiHostUrl)
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> MultiHostUrl:
        return MultiHostUrl.build(
            scheme="postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    # User Configuration
    FIRST_SUPERUSER: str = "admin@deepfakedetector.com"
    FIRST_SUPERUSER_PASSWORD: str = "changethis"

    # File Upload Configuration
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_VIDEO_EXTENSIONS: list[str] = [".mp4", ".avi", ".mov", ".mkv"]
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".bmp"]

    @field_validator("ALLOWED_VIDEO_EXTENSIONS", "ALLOWED_IMAGE_EXTENSIONS", mode="before")
    @classmethod
    def parse_extensions_list(cls, v: Any) -> list[str]:
        """Parse extensions from string (JSON or comma-separated) or return list as-is."""
        if isinstance(v, str):
            # Try to parse as JSON first
            if v.strip().startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    # Fall back to manual parsing
                    v = v.strip("[]")
                    return [ext.strip().strip('"').strip("'") for ext in v.split(",") if ext.strip()]
            else:
                # Comma-separated format
                return [ext.strip() for ext in v.split(",") if ext.strip()]
        elif isinstance(v, list):
            return [str(ext).strip() for ext in v]
        return v

    # ML Model Configuration
    MODEL_PATH: str = "model/models/xception_best.pt"
    DEFAULT_FPS: int = 3
    DEFAULT_THRESHOLD: float = 0.5

settings = Settings()
