from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AnioLectivoBase(BaseModel):
    anio_lectivo: str = Field(..., max_length=20)


class AnioLectivoCreate(AnioLectivoBase):
    activo: Optional[bool] = True


class AnioLectivoUpdate(BaseModel):
    anio_lectivo: Optional[str] = Field(None, max_length=20)
    activo: Optional[bool] = None

    model_config = {"from_attributes": True}


class AnioLectivoResponse(AnioLectivoBase):
    id_anio_lectivo: int
    id_contexto: int
    activo: bool
    creado_en: Optional[datetime] = None
    cerrado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}
