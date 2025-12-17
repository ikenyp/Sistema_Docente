from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import date

# ENUM 
class EstadoEstudiante(str, Enum):
    matriculado = "matriculado"
    activo = "activo"
    inactivo = "inactivo"
    graduado = "graduado"

# Schema Base
class EstudianteBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    cedula : str = Field(..., max_length=20)
    fecha_nacimiento: date
    estado: EstadoEstudiante = EstadoEstudiante.matriculado
    id_curso_actual: Optional[int] = None

# Schema para crear
class EstudianteCreate(EstudianteBase):
    pass

# Schema para actualizar
class EstudianteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cedula : Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    estado: Optional[EstadoEstudiante] = None
    id_curso_actual: Optional[int] = None

    model_config = {
        "from_attributes": True 
    }

# Schema para respuesta
class EstudianteResponse(EstudianteBase):
    id_estudiante: int

    model_config = {
        "from_attributes": True 
    }