from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Kenp2606@localhost:5432/sis_docente"

    # Ignorar variables extra en .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SYNC_DATABASE_URL: str = "postgresql://postgres:Kenp2606@localhost:5432/sis_docente"

settings = Settings()
    