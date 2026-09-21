from pydantic import BaseModel
from typing import Optional


class CMDBase(BaseModel):
    id_curso: int
    id_materia: int
    id_docente: int


class CMDCreate(CMDBase):
    pass


class CMDUpdate(BaseModel):
    id_curso: Optional[int] = None
    id_materia: Optional[int] = None
    id_docente: Optional[int] = None


class CMDResponse(CMDBase):
    id_cmd: int

    model_config = {
        "from_attributes": True
    }


# Schema para docente (relación anidada)
class UsuarioMinimal(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str

    model_config = {
        "from_attributes": True
    }


# Schema para materia (relación anidada)
class MateriaResponse(BaseModel):
    id_materia: int
    nombre: str

    model_config = {
        "from_attributes": True
    }


# Schema para curso (relación anidada)
class CursoMinimal(BaseModel):
    id_curso: int
    nombre: str
    anio_lectivo: str

    model_config = {
        "from_attributes": True
    }


# Schema para respuesta detallada con relaciones
class CMDResponseDetailed(CMDResponse):
    curso: Optional[CursoMinimal] = None
    materia: Optional[MateriaResponse] = None
    docente: Optional[UsuarioMinimal] = None

    model_config = {
        "from_attributes": True
    }
