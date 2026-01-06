from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date
from app.models.enums import TipoInsumoEnum

# Schema Base
class InsumoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ponderacion: float = Field(..., ge=1, le=10)
    tipo_insumo: TipoInsumoEnum

# Schema para crear
class InsumoCreate(InsumoBase):
    id_cmd: int
    id_trimestre: int
    """No se incluye id_insumo ni fecha_creacion, 
    ya que se generan automaticamente"""
    pass 

# Schema para actualizar
class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    ponderacion: Optional[float] = Field(None, ge=1, le=10)
    tipo_insumo: Optional[TipoInsumoEnum] = None
    id_trimestre: Optional[int] = None

# Schema para respuesta
class InsumoResponse(InsumoBase):
    id_insumo: int
    id_cmd: int
    id_trimestre: int
    fecha_creacion: date

    model_config = {
        "from_attributes": True 
    }