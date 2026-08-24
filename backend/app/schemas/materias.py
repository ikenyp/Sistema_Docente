from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

# Schema Base
class MateriaBase(BaseModel):
    codigo: Optional[str] = Field(None, max_length=30)
    nombre: str
    descripcion: Optional[str] = Field(None, max_length=255)

# Schema para crear
class MateriaCreate(MateriaBase):
    pass

# Schema para actualizar
class MateriaUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=30)
    nombre: Optional[str] = Field(None, max_length=120)
    descripcion: Optional[str] = Field(None, max_length=255)

    model_config = {
        "from_attributes": True 
    }

# Schema para respuesta
class MateriaResponse(MateriaBase):
    id_materia: int
    eliminado: bool

    model_config = {
        "from_attributes": True 
    }


class MateriaCatalogoResponse(MateriaResponse):
    uso_total: int

    model_config = {
        "from_attributes": True
    }
