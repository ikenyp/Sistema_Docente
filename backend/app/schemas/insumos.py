from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date
from app.models.enums import TipoInsumoEnum, TrimestreEnum

# Schema Base
class InsumoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ponderacion: float = Field(..., ge=0, le=10)
    tipo_insumo: TipoInsumoEnum
    trimestre: int = Field(..., ge=1, le=3, description="Trimestre: 1, 2 o 3")
    
    @field_validator('trimestre')
    @classmethod
    def validar_trimestre(cls, v):
        if v not in [1, 2, 3]:
            raise ValueError('El trimestre debe ser 1, 2 o 3')
        return v

# Schema para crear
class InsumoCreate(InsumoBase):
    id_cmd: int
    """No se incluye id_insumo ni fecha_creacion, 
    ya que se generan automaticamente"""
    pass 

# Schema para actualizar
class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    ponderacion: Optional[float] = Field(None, ge=0, le=10)
    tipo_insumo: Optional[TipoInsumoEnum] = None
    trimestre: Optional[int] = Field(None, ge=1, le=3)
    
    @field_validator('trimestre')
    @classmethod
    def validar_trimestre(cls, v):
        if v is not None and v not in [1, 2, 3]:
            raise ValueError('El trimestre debe ser 1, 2 o 3')
        return v

# Schema para respuesta
class InsumoResponse(InsumoBase):
    id_insumo: int
    id_cmd: int
    fecha_creacion: date

    model_config = {
        "from_attributes": True 
    }