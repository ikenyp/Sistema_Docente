from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

# Schema Base
class MateriaBase(BaseModel):
    nombre: str

# Schema para crear
class MateriaCreate(MateriaBase):
    pass

# Schema para actualizar
class MateriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=120)

    model_config = {
        "from_attributes": True 
    }

# Schema para respuesta
class MateriaResponse(MateriaBase):
    id_materia: int

    model_config = {
        "from_attributes": True 
    }
