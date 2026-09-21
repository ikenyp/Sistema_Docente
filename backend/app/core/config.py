from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Kenp2606@localhost:5432/sis_docente"
    APP_MODE: Literal["institucional", "personal"] = "institucional"
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # Ignorar variables extra en .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SYNC_DATABASE_URL: str = "postgresql://postgres:Kenp2606@localhost:5432/sis_docente"

settings = Settings()
    
