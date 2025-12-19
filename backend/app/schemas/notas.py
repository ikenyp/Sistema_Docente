from pydantic import BaseModel, Field
from typing import Optional

# Schema Base
class NotaBase(BaseModel):
    id_alumno: int
    id_curso_materia_docente: int
    nota: float = Field(..., ge=0, le=10)

# Schema para crear
class NotaCreate(NotaBase):
    pass

# Schema para actualizar
class NotaUpdate(BaseModel):
    id_alumno: Optional[int] = None
    id_curso_materia_docente: Optional[int] = None
    nota: Optional[float] = Field(None, ge=0, le=10)

# Schema para respuesta
class NotaResponse(NotaBase):
    id_nota: int

    model_config = {
        "from_attributes": True 
    }