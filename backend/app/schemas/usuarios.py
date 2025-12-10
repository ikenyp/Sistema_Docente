from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

# ENUMS
class RolUsuario(str, Enum):
    docente = "docente"
    administrativo = "administrativo"

#Schema Base
class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    rol: RolUsuario

#Schema para crer
class UsuarioCreate(UsuarioBase):
    contrasena: str

# Schema para actualizar
class UsuarioUpdate(BaseModel):
    nombre: Optional [str] = None
    apellido: Optional [str] = None
    correo: Optional [EmailStr] = None
    rol: Optional [RolUsuario] = None
    contrasena: Optional [str] = None

# Schema para respuesta
class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: EmailStr
    rol: RolUsuario

    model_config = {
        "from_attributes": True 
    }
