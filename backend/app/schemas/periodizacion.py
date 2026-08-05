from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class PeriodoAcademicoBase(BaseModel):
    numero_periodo: int = Field(..., ge=1)
    nombre_periodo: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date


class PeriodoAcademicoCreate(PeriodoAcademicoBase):
    pass


class PeriodoAcademicoUpdate(BaseModel):
    numero_periodo: Optional[int] = Field(None, ge=1)
    nombre_periodo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class PeriodoAcademicoResponse(PeriodoAcademicoBase):
    id_periodo: int

    model_config = {"from_attributes": True}


class ConfiguracionPeriodizacionBase(BaseModel):
    anio_lectivo: str = Field(..., min_length=9, max_length=20)
    tipo_periodizacion: str
    cantidad_periodos: int = Field(..., ge=1)
    nombre_periodo_singular: Optional[str] = None
    activo: bool = True


class ConfiguracionPeriodizacionCreate(ConfiguracionPeriodizacionBase):
    id_contexto: Optional[int] = None


class ConfiguracionPeriodizacionUpdate(BaseModel):
    tipo_periodizacion: Optional[str] = None
    cantidad_periodos: Optional[int] = Field(None, ge=1)
    nombre_periodo_singular: Optional[str] = None
    activo: Optional[bool] = None


class ConfiguracionPeriodizacionResponse(ConfiguracionPeriodizacionBase):
    id_config_periodizacion: int
    id_contexto: int
    completa: bool = False
    periodos: List[PeriodoAcademicoResponse] = []

    model_config = {"from_attributes": True}


class ConfiguracionCompletaCreate(BaseModel):
    id_contexto: Optional[int] = None
    anio_lectivo: str = Field(..., min_length=9, max_length=20)
    tipo_periodizacion: str
    cantidad_periodos: int = Field(..., ge=1)
    nombre_periodo_singular: Optional[str] = None
    periodos: List[PeriodoAcademicoCreate]
