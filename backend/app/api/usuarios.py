from fastapi import APIRouter, Depends, Request, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_context_role
from app.core.database import get_session
from app.schemas.usuarios import (
    RolUsuarioEnum,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResponse
)

from app.services import usuarios as service
from app.core.context_manager import resolve_contexto_id
from app.auth.dependencies import get_current_user

router = APIRouter(
    tags=["Usuarios"],
    dependencies=[Depends(require_context_role(RolUsuarioEnum.administrativo))],
)

@router.post("/", response_model=UsuarioResponse)
async def crear_usuario(
    data: UsuarioCreate,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_usuario(db, data, id_contexto)

@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios(
    rol: RolUsuarioEnum | None = Query(None),
    nombre: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, le=100),
    request: Request = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_usuarios(
        db=db,
        rol=rol,
        nombre=nombre,
        page=page,
        size=size,
        id_contexto=id_contexto,
    )

@router.get("/{id_usuario}", response_model=UsuarioResponse)
async def obtener_usuario(
    id_usuario: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_usuario_en_contexto(db, id_usuario, id_contexto)

@router.put("/{id_usuario}", response_model=UsuarioResponse)
async def actualizar_usuario(
    id_usuario: int,
    data: UsuarioUpdate,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await service.obtener_usuario_en_contexto(db, id_usuario, id_contexto)
    return await service.actualizar_usuario(db, id_usuario, data)

@router.delete("/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_usuario(
    id_usuario: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await service.obtener_usuario_en_contexto(db, id_usuario, id_contexto)
    return await service.eliminar_usuario(db, id_usuario)
