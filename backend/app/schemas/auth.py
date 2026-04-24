from pydantic import BaseModel, EmailStr, Field


class RegistroDocentePersonal(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    contrasena: str = Field(min_length=6)


class SolicitudRecuperacionContrasena(BaseModel):
    correo: EmailStr


class ConfirmacionRecuperacionContrasena(BaseModel):
    token: str
    nueva_contrasena: str = Field(min_length=6)
