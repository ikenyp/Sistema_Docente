from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.context_manager import resolve_contexto_id
from app.schemas.comportamiento import (
    ComportamientoCreate,
    ComportamientoUpdate,
    ComportamientoResponse
)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import comportamiento as service
from app.auth.dependencies import get_current_user, require_role
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Comportamiento"]
)


@router.post("/", response_model=ComportamientoResponse)
async def crear_comportamiento(
    data: ComportamientoCreate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_comportamiento(db, data, id_contexto)


@router.get("/", response_model=list[ComportamientoResponse])
async def listar_comportamientos(
    id_estudiante: int | None = Query(None),
    id_curso: int | None = Query(None),
    mes: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_comportamientos(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        mes=mes,
        page=page,
        size=size
    )


@router.get("/{id_comportamiento}", response_model=ComportamientoResponse)
async def obtener_comportamiento(
    id_comportamiento: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_comportamiento(db, id_comportamiento, id_contexto)


@router.put("/{id_comportamiento}", response_model=ComportamientoResponse)
async def actualizar_comportamiento(
    id_comportamiento: int,
    data: ComportamientoUpdate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden modificar comportamiento"
        )
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.actualizar_comportamiento(
        db,
        id_comportamiento,
        data,
        id_contexto,
    )


@router.delete("/{id_comportamiento}", status_code=200)
async def eliminar_comportamiento(
    id_comportamiento: int,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden eliminar comportamiento"
        )
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.eliminar_comportamiento(db, id_comportamiento, id_contexto)

