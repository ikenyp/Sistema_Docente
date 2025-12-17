from pydantic import BaseModel
from typing import Optional

# Schema Base
class NotaBase(BaseModel):
    id_alumno: int
    id_curso_materia_docente: int
    nota: float

# Schema para crear
class NotaCreate(NotaBase):
    pass

# Schema para actualizar
class NotaUpdate(BaseModel):
    id_alumno: Optional[int] = None
    id_curso_materia_docente: Optional[int] = None
    nota: Optional[float] = None

# Schema para respuesta
class NotaResponse(NotaBase):
    id_nota: int

    model_config = {
        "from_attributes": True 
    }