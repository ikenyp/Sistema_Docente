from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Kenp2606@localhost:5432/sis_docente"
    APP_MODE: Literal["institucional", "personal"] = "institucional"

    # Ignorar variables extra en .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SYNC_DATABASE_URL: str = "postgresql://postgres:Kenp2606@localhost:5432/sis_docente"

settings = Settings()
    