from pydantic import BaseModel, EmailStr


class InstitucionCreate(BaseModel):
    nombre: str
    correo_administrador: EmailStr
    nombre_administrador: str
    apellido_administrador: str
    contrasena_temporal: str


class InstitucionResponse(BaseModel):
    id_institucion: int
    nombre: str
    slug: str
    activo: bool
    id_contexto: int
    nombre_administrador: str | None = None
    apellido_administrador: str | None = None
    correo_administrador: EmailStr | None = None
