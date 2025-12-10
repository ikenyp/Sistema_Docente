from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum

# ENUM
class EstadoAsistencia(str, Enum):
    presente = "presente"
    ausente = "ausente"
    justificado = "justificado"

# Schema Base
class AsistenciaBase(BaseModel):
    id_cmd: int
    id_estudiante: int
    fecha: date
    estado: EstadoAsistencia

# Schema para crear
class AsistenciaCreate(AsistenciaBase):
    pass

# Schema para actualizar
class AsistenciaUpdate(BaseModel):
    id_cmd: Optional[int] = None
    id_estudiante: Optional[int] = None
    fecha: Optional[date] = None
    estado: Optional[EstadoAsistencia] = None

# Schema para respuesta
class AsistenciaResponse(AsistenciaBase):
    id_asistencia: int

    model_config = {
        "from_attributes": True 
    }