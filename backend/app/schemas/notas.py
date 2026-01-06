from pydantic import BaseModel, Field
from typing import Optional

# Schema Base
class NotaBase(BaseModel):
    id_estudiante: int
    id_insumo: int
    calificacion: float = Field(..., ge=0, le=10)

# Schema para crear
class NotaCreate(NotaBase):
    pass

# Schema para actualizar
class NotaUpdate(BaseModel):
    id_estudiante: Optional[int] = None
    id_insumo: Optional[int] = None
    calificacion: Optional[float] = Field(None, ge=0, le=10)

# Schema para respuesta
class NotaResponse(NotaBase):
    id_nota: int

    model_config = {
        "from_attributes": True 
    }