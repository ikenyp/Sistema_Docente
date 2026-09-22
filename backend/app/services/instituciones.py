import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_contrasena
from app.models.contextos import Contexto
from app.models.instituciones import Institucion
from app.models.usuarios import Usuario
from app.models.usuarios_contextos import UsuarioContexto
from app.schemas.usuarios import RolUsuarioEnum


def normalizar_slug(nombre: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", nombre.lower()).strip("-")
    return slug[:120] or "institucion"


async def crear_institucion_con_administrador(
    db: AsyncSession,
    *,
    nombre_institucion: str,
    correo_administrador: str,
    nombre_administrador: str | None = None,
    apellido_administrador: str | None = None,
    contrasena_temporal: str | None = None,
) -> tuple[Institucion, Usuario, bool]:
    slug = normalizar_slug(nombre_institucion)
    existente = await db.execute(select(Institucion).where(Institucion.slug == slug))
    if existente.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una institución con ese nombre")

    usuario_result = await db.execute(select(Usuario).where(Usuario.correo == correo_administrador.lower()))
    administrador = usuario_result.scalar_one_or_none()
    cuenta_creada = administrador is None
    if administrador is None:
        if not all([nombre_administrador, apellido_administrador, contrasena_temporal]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Para crear el administrador debes indicar nombre, apellido y contraseña temporal",
            )
        administrador = Usuario(
            nombre=nombre_administrador.strip(),
            apellido=apellido_administrador.strip(),
            correo=correo_administrador.lower().strip(),
            contrasena=hash_contrasena(contrasena_temporal),
            rol=RolUsuarioEnum.administrativo,
            activo=True,
        )
        db.add(administrador)
        await db.flush()

    institucion = Institucion(nombre=nombre_institucion.strip(), slug=slug, activo=True)
    db.add(institucion)
    await db.flush()

    contexto = Contexto(
        tipo_modo="institucional",
        nombre=institucion.nombre,
        id_institucion=institucion.id_institucion,
        activo=True,
    )
    db.add(contexto)
    await db.flush()
    db.add(
        UsuarioContexto(
            id_usuario=administrador.id_usuario,
            id_contexto=contexto.id_contexto,
            rol=RolUsuarioEnum.administrativo.value,
            activo=True,
        ),
    )
    await db.commit()
    await db.refresh(institucion)
    await db.refresh(administrador)
    return institucion, administrador, cuenta_creada
