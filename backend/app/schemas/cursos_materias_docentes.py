from pydantic import BaseModel
from typing import Optional

# Schema Base
class CMDBase(BaseModel):
    id_curso: int
    id_materia: int
    id_docente: int

# Schema para crear
class CMDCreate(CMDBase):
    pass

# Schema para actualizar
class CMDUpdate(BaseModel):
    id_curso: Optional[int] = None
    id_materia: Optional[int] = None
    id_docente: Optional[int] = None

# Schema para respuesta
class CMDResponse(CMDBase):
    id_cmd: int

    model_config = {
        "from_attributes": True
    }