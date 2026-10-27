"""Application configuration using pydantic-settings."""

import os
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "APAAR ReconX"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # True prints every SQL query; enable only for local debugging

    # Database — defaults to SQLite for easy local dev
    DATABASE_URL: str = "sqlite:///./apaar_reconx.db"

    # JWT
    # Read from JWT_SECRET or SECRET_KEY (render.yaml / docker-compose set SECRET_KEY)
    JWT_SECRET: str = Field(
        default="apaar-reconx-local-dev-secret-change-me",
        validation_alias=AliasChoices("JWT_SECRET", "SECRET_KEY"),
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480  # 8 hours

    # File Upload
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls"]

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # Public URL used in certificate QR codes (frontend /verify/<id> page).
    # Leave empty to use the host the request came from
    PUBLIC_BASE_URL: str = ""

    # Seed
    SEED_ON_STARTUP: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "populate_by_name": True, "extra": "ignore"}


settings = Settings()
