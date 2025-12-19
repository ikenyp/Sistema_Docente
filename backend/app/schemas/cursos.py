from pydantic import BaseModel, Field
from typing import Optional

# Schema Base
class CursoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    anio_lectivo: str 
    id_docente: Optional[int] = None
    id_tutor: Optional[int] = None


# Schema para crear
class CursoCreate(CursoBase):
    pass

# Schema para actualizar
class CursoUpdate(BaseModel):
    nombre: Optional[str] = None
    anio_lectivo: Optional[str] = None
    id_docente: Optional[int] = None
    id_tutor: Optional[int] = None

    model_config = {
        "from_attributes": True
    }

# Schema para respuesta
class CursoResponse(CursoBase):
    id_curso: int

    model_config = {
        "from_attributes": True
    }