from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.context_manager import resolve_contexto_id
from app.schemas.notas import (NotaCreate, NotaUpdate,NotaResponse)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import notas as service
from app.auth.dependencies import get_current_user, require_role
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Notas"]
)


@router.post("/", response_model=NotaResponse)
async def crear_nota(
    data: NotaCreate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_nota(db, data, id_contexto)


@router.get("/", response_model=list[NotaResponse])
async def listar_notas(
    id_estudiante: int | None = Query(None),
    id_insumo: int | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_notas(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_insumo=id_insumo,
        page=page,
        size=size
    )


@router.get("/{id_nota}", response_model=NotaResponse)
async def obtener_nota(
    id_nota: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_nota(db, id_nota, id_contexto)


@router.put("/{id_nota}", response_model=NotaResponse)
async def actualizar_nota(
    id_nota: int,
    data: NotaUpdate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden modificar notas"
        )
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.actualizar_nota(db, id_nota, data, id_contexto)


@router.delete("/{id_nota}", status_code=200)
async def eliminar_nota(
    id_nota: int,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden eliminar notas"
        )
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.eliminar_nota(db, id_nota, id_contexto)
