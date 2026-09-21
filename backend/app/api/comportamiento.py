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
from app.auth.dependencies import get_current_user
from app.models.usuarios import Usuario
from app.services.authorization import (
    validar_usuario_puede_editar_comportamiento,
    validar_usuario_puede_ver_comportamiento,
    validar_usuario_puede_ver_curso,
    validar_usuario_puede_ver_estudiante,
    validar_docente_puede_registrar_comportamiento,
)

router = APIRouter(
    tags=["Comportamiento"]
)


@router.post("/", response_model=ComportamientoResponse)
async def crear_comportamiento(
    data: ComportamientoCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para crear comportamiento")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_docente_puede_registrar_comportamiento(
            db, data.id_curso, current_user.id_usuario, id_contexto
        )
        await validar_usuario_puede_ver_estudiante(db, data.id_estudiante, current_user, id_contexto)
    return await service.crear_comportamiento(db, data, id_contexto)


@router.get("/", response_model=list[ComportamientoResponse])
async def listar_comportamientos(
    id_estudiante: int | None = Query(None),
    id_curso: int | None = Query(None),
    periodo: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        if id_curso is None and id_estudiante is None:
            raise HTTPException(status_code=400, detail="Debes filtrar por curso o estudiante")
        if id_curso is not None:
            await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
        if id_estudiante is not None:
            await validar_usuario_puede_ver_estudiante(db, id_estudiante, current_user, id_contexto)
    return await service.listar_comportamientos(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        periodo=periodo,
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
    await validar_usuario_puede_ver_comportamiento(db, id_comportamiento, current_user, id_contexto)
    return await service.obtener_comportamiento(db, id_comportamiento, id_contexto)


@router.put("/{id_comportamiento}", response_model=ComportamientoResponse)
async def actualizar_comportamiento(
    id_comportamiento: int,
    data: ComportamientoUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para actualizar comportamiento")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await validar_usuario_puede_editar_comportamiento(db, id_comportamiento, current_user, id_contexto)
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
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para eliminar comportamiento")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await validar_usuario_puede_editar_comportamiento(db, id_comportamiento, current_user, id_contexto)
    return await service.eliminar_comportamiento(db, id_comportamiento, id_contexto)

