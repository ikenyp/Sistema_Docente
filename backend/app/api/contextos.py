from fastapi import APIRouter, Depends, HTTPException, Request, status
import secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.context_manager import resolve_contexto_id
from app.core.database import get_session
from app.models.contextos import Contexto
from app.models.usuarios import Usuario
from app.models.usuarios_contextos import UsuarioContexto
from app.core.security import hash_contrasena
from app.schemas.contextos import (
    InvitacionMembresiaCreate,
    InvitacionMembresiaResponse,
    MembresiaCreate,
    MembresiaResponse,
    MembresiaUpdate,
)
from app.schemas.usuarios import RolUsuarioEnum


router = APIRouter(prefix="/contextos", tags=["Contextos"])


async def _contexto_administrable(db, usuario, request) -> int:
    id_contexto = await resolve_contexto_id(db, usuario, request)
    membresia = await db.execute(
        select(UsuarioContexto).where(
            UsuarioContexto.id_usuario == usuario.id_usuario,
            UsuarioContexto.id_contexto == id_contexto,
            UsuarioContexto.activo == True,
            UsuarioContexto.rol == RolUsuarioEnum.administrativo.value,
        ),
    )
    if membresia.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes administrar miembros en este contexto")
    return id_contexto


@router.get("/miembros", response_model=list[MembresiaResponse])
async def listar_miembros(request: Request, db: AsyncSession = Depends(get_session), usuario=Depends(get_current_user)):
    id_contexto = await _contexto_administrable(db, usuario, request)
    result = await db.execute(
        select(UsuarioContexto, Usuario)
        .join(Usuario, Usuario.id_usuario == UsuarioContexto.id_usuario)
        .where(UsuarioContexto.id_contexto == id_contexto)
        .where(UsuarioContexto.activo == True, Usuario.activo == True)
        .order_by(Usuario.apellido, Usuario.nombre),
    )
    return [
        MembresiaResponse(
            id_usuario_contexto=m.id_usuario_contexto,
            id_usuario=u.id_usuario,
            nombre=u.nombre,
            apellido=u.apellido,
            correo=u.correo,
            rol=m.rol,
            activo=m.activo,
        )
        for m, u in result.all()
    ]


@router.post("/miembros", response_model=MembresiaResponse, status_code=status.HTTP_201_CREATED)
async def agregar_miembro(data: MembresiaCreate, request: Request, db: AsyncSession = Depends(get_session), usuario=Depends(get_current_user)):
    id_contexto = await _contexto_administrable(db, usuario, request)
    resultado = await db.execute(select(Usuario).where(Usuario.correo == data.correo.lower()))
    miembro = resultado.scalar_one_or_none()
    if miembro is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No existe una cuenta con ese correo; crea o invita primero al usuario")

    resultado = await db.execute(select(UsuarioContexto).where(UsuarioContexto.id_usuario == miembro.id_usuario, UsuarioContexto.id_contexto == id_contexto))
    membresia = resultado.scalar_one_or_none()
    if membresia is None:
        membresia = UsuarioContexto(id_usuario=miembro.id_usuario, id_contexto=id_contexto, rol=data.rol.value, activo=True)
        db.add(membresia)
    else:
        membresia.rol = data.rol.value
        membresia.activo = True
    await db.commit()
    await db.refresh(membresia)
    return MembresiaResponse(id_usuario_contexto=membresia.id_usuario_contexto, id_usuario=miembro.id_usuario, nombre=miembro.nombre, apellido=miembro.apellido, correo=miembro.correo, rol=membresia.rol, activo=membresia.activo)


@router.post("/miembros/invitaciones", response_model=InvitacionMembresiaResponse, status_code=status.HTTP_201_CREATED)
async def invitar_miembro(
    data: InvitacionMembresiaCreate,
    request: Request,
    db: AsyncSession = Depends(get_session),
    usuario=Depends(get_current_user),
):
    id_contexto = await _contexto_administrable(db, usuario, request)
    correo = data.correo.lower()
    existente = await db.execute(select(Usuario).where(Usuario.correo == correo))
    if existente.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La cuenta ya existe; usa la vinculación por correo",
        )

    contrasena_temporal = secrets.token_urlsafe(12)
    miembro = Usuario(
        nombre=data.nombre.strip(),
        apellido=data.apellido.strip(),
        correo=correo,
        contrasena=hash_contrasena(contrasena_temporal),
        # El rol global se conserva temporalmente por compatibilidad; la
        # autorización efectiva migrará a la membresía en el siguiente paso.
        rol=data.rol,
        activo=True,
    )
    db.add(miembro)
    await db.flush()
    membresia = UsuarioContexto(
        id_usuario=miembro.id_usuario,
        id_contexto=id_contexto,
        rol=data.rol.value,
        activo=True,
    )
    db.add(membresia)
    await db.commit()
    await db.refresh(membresia)
    return InvitacionMembresiaResponse(
        id_usuario_contexto=membresia.id_usuario_contexto,
        id_usuario=miembro.id_usuario,
        nombre=miembro.nombre,
        apellido=miembro.apellido,
        correo=miembro.correo,
        rol=membresia.rol,
        activo=membresia.activo,
        contrasena_temporal=contrasena_temporal,
    )


@router.patch("/miembros/{id_usuario}", response_model=MembresiaResponse)
async def actualizar_miembro(id_usuario: int, data: MembresiaUpdate, request: Request, db: AsyncSession = Depends(get_session), usuario=Depends(get_current_user)):
    id_contexto = await _contexto_administrable(db, usuario, request)
    resultado = await db.execute(select(UsuarioContexto, Usuario).join(Usuario).where(UsuarioContexto.id_usuario == id_usuario, UsuarioContexto.id_contexto == id_contexto))
    membresia, miembro = resultado.one_or_none() or (None, None)
    if membresia is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El usuario no pertenece a este contexto")
    if data.rol is not None:
        membresia.rol = data.rol.value
    if data.activo is not None:
        membresia.activo = data.activo
    await db.commit()
    await db.refresh(membresia)
    return MembresiaResponse(id_usuario_contexto=membresia.id_usuario_contexto, id_usuario=miembro.id_usuario, nombre=miembro.nombre, apellido=miembro.apellido, correo=miembro.correo, rol=membresia.rol, activo=membresia.activo)
