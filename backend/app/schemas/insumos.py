from pydantic import BaseModel
from typing import Optional
from datetime import date

# Schema Base
class InsumoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ponderacion: float

# Schema para crear
class InsumoCreate(InsumoBase):
    id_cmd: int
    """"No se incluye id_insumo ni fecha_creacion, 
    ya que se generan automaticamente"""
    pass 

# Schema para actualizar
class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    ponderacion: Optional[float] = None

# Schema para respuesta
class InsumoResponse(InsumoBase):
    id_insumo: int
    id_cmd: int
    fecha_creacion: date

    model_config = {
        "from_attributes": True 
    }