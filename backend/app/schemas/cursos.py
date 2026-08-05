from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.cursos_materias_docentes import CMDResponseDetailed
from app.schemas.estudiantes import EstudianteResponse
from app.schemas.estructuras_academicas import EstructuraMateriaResponse
from app.schemas.periodizacion import ConfiguracionPeriodizacionResponse

# Schema Base
class CursoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    anio_lectivo: str 
    id_tutor: Optional[int] = None
    id_estructura_academica: Optional[int] = None


# Schema para crear
class CursoCreate(CursoBase):
    pass

# Schema para actualizar
class CursoUpdate(BaseModel):
    nombre: Optional[str] = None
    anio_lectivo: Optional[str] = None
    id_tutor: Optional[int] = None
    id_estructura_academica: Optional[int] = None

    model_config = {
        "from_attributes": True
    }

# Schema para tutor (relación anidada)
class TutorMinimal(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str

    model_config = {
        "from_attributes": True
    }


class EstructuraAcademicaMinimal(BaseModel):
    id_estructura_academica: int
    nombre: str
    nivel: str
    subnivel: Optional[str] = None
    modalidad: Optional[str] = None
    especialidad: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

# Schema para respuesta
class CursoResponse(CursoBase):
    id_curso: int

    model_config = {
        "from_attributes": True
    }

# Schema para respuesta detallada con tutor
class CursoResponseDetailed(CursoResponse):
    tutor: Optional[TutorMinimal] = None
    estructura_academica: Optional[EstructuraAcademicaMinimal] = None

    model_config = {
        "from_attributes": True
    }


class CursoDashboardResponse(BaseModel):
    curso: CursoResponseDetailed
    estudiantes: list[EstudianteResponse]
    asignaciones: list[CMDResponseDetailed]
    materias_estructura: list[EstructuraMateriaResponse]
    periodizacion: Optional[ConfiguracionPeriodizacionResponse] = None

    model_config = {
        "from_attributes": True
    }
