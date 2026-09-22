from pydantic import BaseModel, EmailStr

from app.schemas.usuarios import RolUsuarioEnum


class MembresiaCreate(BaseModel):
    correo: EmailStr
    rol: RolUsuarioEnum = RolUsuarioEnum.docente


class InvitacionMembresiaCreate(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    rol: RolUsuarioEnum = RolUsuarioEnum.docente


class MembresiaUpdate(BaseModel):
    rol: RolUsuarioEnum | None = None
    activo: bool | None = None


class MembresiaResponse(BaseModel):
    id_usuario_contexto: int
    id_usuario: int
    nombre: str
    apellido: str
    correo: EmailStr
    rol: RolUsuarioEnum
    activo: bool


class InvitacionMembresiaResponse(MembresiaResponse):
    contrasena_temporal: str
