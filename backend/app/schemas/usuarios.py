from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from app.models.enums import RolUsuarioEnum

# ENUMS


#Schema Base
class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    rol: RolUsuarioEnum

#Schema para crer
class UsuarioCreate(UsuarioBase):
    contrasena: str

# Schema para actualizar
class UsuarioUpdate(BaseModel):
    nombre: Optional [str] = None
    apellido: Optional [str] = None
    correo: Optional [EmailStr] = None
    rol: Optional [RolUsuarioEnum] = None
    contrasena: Optional [str] = None

# Schema para respuesta
class UsuarioResponse(UsuarioBase):
    id_usuario: int
    activo: bool

    model_config = {
        "from_attributes": True 
    }

# Schema para respuesta sin contraseña (más seguro)
class UsuarioResponseMin(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str
    rol: RolUsuarioEnum
    activo: bool

    model_config = {
        "from_attributes": True
    }
