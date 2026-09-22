from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # La conexión real debe llegar por variables de entorno; estas URLs locales
    # sin credenciales permiten importar modelos y ejecutar pruebas unitarias.
    DATABASE_URL: str = "postgresql+asyncpg://localhost/sis_docente"
    SYNC_DATABASE_URL: str = "postgresql://localhost/sis_docente"
    APP_MODE: Literal["institucional", "personal"] = "institucional"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    PLATFORM_OPERATOR_EMAILS: str = ""

    # Ignorar variables extra en .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
    
