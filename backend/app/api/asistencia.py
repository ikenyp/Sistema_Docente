from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.context_manager import resolve_contexto_id
from app.schemas.asistencia import (
    AsistenciaCreate,
    AsistenciaUpdate,
    AsistenciaResponse,
    EstadoAsistencia
)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import asistencia as service
from app.auth.dependencies import get_current_user
from app.models.usuarios import Usuario
from app.services.authorization import (
    validar_usuario_puede_editar_asistencia,
    validar_usuario_puede_editar_cmd,
    validar_usuario_puede_ver_asistencia,
    validar_usuario_puede_ver_cmd,
    validar_usuario_puede_ver_estudiante,
)

#Ruta
router = APIRouter(
    tags=["Asistencia"]
)

#Crear Asistencia
@router.post("/", response_model=AsistenciaResponse)
async def crear_asistencia(
    data: AsistenciaCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para crear asistencia")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_cmd(db, data.id_cmd, current_user, id_contexto)
        await validar_usuario_puede_ver_estudiante(db, data.id_estudiante, current_user, id_contexto)
    return await service.crear_asistencia(db, data, id_contexto)


#Listar Asistencias
@router.get("/", response_model=list[AsistenciaResponse])
async def listar_asistencias(
    id_cmd: int | None = Query(None),
    id_estudiante: int | None = Query(None),
    fecha: str | None = Query(None),
    estado: EstadoAsistencia | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        if id_cmd is None and id_estudiante is None:
            raise HTTPException(status_code=400, detail="Debes filtrar por asignación o estudiante")
        if id_cmd is not None:
            await validar_usuario_puede_ver_cmd(db, id_cmd, current_user, id_contexto)
        if id_estudiante is not None:
            await validar_usuario_puede_ver_estudiante(db, id_estudiante, current_user, id_contexto)
    return await service.listar_asistencias(
        db=db,
        id_contexto=id_contexto,
        id_cmd=id_cmd,
        id_estudiante=id_estudiante,
        fecha=fecha,
        estado=estado,
        page=page,
        size=size
    )


#Obtener asistencia
@router.get("/{id_asistencia}", response_model=AsistenciaResponse)
async def obtener_asistencia(
    id_asistencia: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await validar_usuario_puede_ver_asistencia(db, id_asistencia, current_user, id_contexto)
    return await service.obtener_asistencia(db, id_asistencia, id_contexto)


#Actualizar asistencia
@router.put("/{id_asistencia}", response_model=AsistenciaResponse)
async def actualizar_asistencia(
    id_asistencia: int,
    data: AsistenciaUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para actualizar asistencia")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_asistencia(db, id_asistencia, current_user, id_contexto)
    return await service.actualizar_asistencia(db, id_asistencia, data, id_contexto)


#Eliminar
@router.delete("/{id_asistencia}", status_code=200)
async def eliminar_asistencia(
    id_asistencia: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para eliminar asistencia")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_asistencia(db, id_asistencia, current_user, id_contexto)
    return await service.eliminar_asistencia(db, id_asistencia, id_contexto)

