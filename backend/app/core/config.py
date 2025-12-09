from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Kenp2606@localhost:5432/sis_docente"

settings = Settings()
