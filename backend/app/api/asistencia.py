from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.asistencia import (
    AsistenciaCreate,
    AsistenciaUpdate,
    AsistenciaResponse,
    EstadoAsistencia
)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import asistencia as service
from app.auth.dependencies import get_current_user, require_role
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Asistencia"]
)


@router.post("/", response_model=AsistenciaResponse)
async def crear_asistencia(
    data: AsistenciaCreate,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_asistencia(db, data)


@router.get("/", response_model=list[AsistenciaResponse])
async def listar_asistencias(
    id_cmd: int | None = Query(None),
    id_estudiante: int | None = Query(None),
    fecha: str | None = Query(None),
    estado: EstadoAsistencia | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_asistencias(
        db=db,
        id_cmd=id_cmd,
        id_estudiante=id_estudiante,
        fecha=fecha,
        estado=estado,
        page=page,
        size=size
    )


@router.get("/{id_asistencia}", response_model=AsistenciaResponse)
async def obtener_asistencia(
    id_asistencia: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_asistencia(db, id_asistencia)


@router.put("/{id_asistencia}", response_model=AsistenciaResponse)
async def actualizar_asistencia(
    id_asistencia: int,
    data: AsistenciaUpdate,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden modificar asistencia"
        )
    return await service.actualizar_asistencia(db, id_asistencia, data)

@router.delete("/{id_asistencia}", status_code=200)
async def eliminar_asistencia(
    id_asistencia: int,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden eliminar asistencia"
        )
    return await service.eliminar_asistencia(db, id_asistencia)

