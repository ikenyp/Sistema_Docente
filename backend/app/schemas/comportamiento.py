from pydantic import BaseModel
from typing import Optional
from enum import Enum

# ENUM
class ValorComportamiento(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"

# Schema Base
class ComportamientoBase(BaseModel):
    id_estudiante: int
    id_curso: int
    mes: str  
    valor: ValorComportamiento
    observaciones: Optional[str] = None

# Schema para crear
class ComportamientoCreate(ComportamientoBase):
    pass

# Schema para actualizar
class ComportamientoUpdate(BaseModel):
    mes: Optional[str] = None
    valor: Optional[ValorComportamiento] = None
    observaciones: Optional[str] = None

    model_config = {
        "from_attributes": True 
    }

# Schema para respuesta
class ComportamientoResponse(ComportamientoBase):
    id_comportamiento: int

    model_config = {
        "from_attributes": True 
    }