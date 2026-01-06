from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class TrimestreBase(BaseModel):
    numero_trimestre: int = Field(..., ge=1, le=3, description="Número del trimestre (1, 2 o 3)")
    anio_lectivo: str = Field(..., min_length=9, max_length=20, description="Año lectivo, ej: '2025-2026'")
    fecha_inicio: date
    fecha_fin: date


class TrimestreCreate(TrimestreBase):
    id_curso: int


class TrimestreUpdate(BaseModel):
    numero_trimestre: Optional[int] = Field(None, ge=1, le=3)
    anio_lectivo: Optional[str] = Field(None, min_length=9, max_length=20)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class TrimestreResponse(TrimestreBase):
    id_trimestre: int
    id_curso: int

    class Config:
        from_attributes = True
