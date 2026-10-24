"""Application configuration using pydantic-settings."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "APAAR ReconX"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database — defaults to SQLite for easy local dev
    DATABASE_URL: str = "sqlite:///./apaar_reconx.db"

    # JWT
    JWT_SECRET: str = "apaar-reconx-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480  # 8 hours

    # File Upload
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls"]

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # Seed
    SEED_ON_STARTUP: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
