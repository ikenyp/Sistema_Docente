from fastapi import APIRouter, Depends, HTTPException, status, Request
import logging
import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Query

from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.estudiantes import (
    EstudianteCreate,
    EstudianteUpdate,
    EstudianteResponse,
    EstadoEstudiante
)
from app.services import estudiantes as service
from app.auth.dependencies import get_current_user
from app.models.usuarios import Usuario
from app.schemas.usuarios import RolUsuarioEnum
from app.services.authorization import validar_docente_puede_editar_curso, validar_usuario_puede_ver_curso

router = APIRouter(
    tags=["Estudiantes"]
)


def _validar_gestion_estudiantes(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar estudiantes"
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar estudiantes"
        )

@router.post("/", response_model=EstudianteResponse)
async def crear_estudiante(
    data: EstudianteCreate,
    db: AsyncSession = Depends(get_session),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user)
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request) and data.id_curso_actual is not None:
        await validar_docente_puede_editar_curso(db, data.id_curso_actual, current_user.id_usuario, id_contexto)

    # Log incoming data and auth header for debugging
    try:
        logging.debug("crear_estudiante headers: %s", request.headers.get("authorization") if request else None)
        logging.debug("crear_estudiante payload: %s", data.model_dump() if hasattr(data, 'model_dump') else dict(data))
    except Exception:
        logging.debug("No se pudo loggear request info")

    try:
        return await service.crear_estudiante(db, data)
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error en crear_estudiante: %s", e)
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor")


@router.get("/", response_model=list[EstudianteResponse])
async def listar_estudiantes(
    estado: EstadoEstudiante | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    apellido: str | None = Query(None, description="Búsqueda parcial por apellido"),
    id_curso: int | None = Query(None, description="Filtrar por curso actual"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    request: Request = None,
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol != RolUsuarioEnum.administrativo:
        id_contexto = await resolve_contexto_id(db, current_user, request)
        if id_curso is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes filtrar por curso para listar estudiantes")
        if is_personal_mode(request):
            await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
        else:
            await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
    return await service.listar_estudiantes(
        db=db,
        estado=estado,
        nombre=nombre,
        apellido=apellido,
        id_curso_actual=id_curso,
        page=page,
        size=size
    )



@router.get("/{id_estudiante}", response_model=EstudianteResponse)
async def obtener_estudiante(
    id_estudiante: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    estudiante = await service.obtener_estudiante(db, id_estudiante=id_estudiante)

    if is_personal_mode(request) and current_user.rol == RolUsuarioEnum.docente and estudiante.id_curso_actual is not None:
        await validar_docente_puede_editar_curso(db, estudiante.id_curso_actual, current_user.id_usuario, id_contexto)

    return estudiante


@router.put("/{id_estudiante}", response_model=EstudianteResponse)
async def actualizar_estudiante(
    id_estudiante: int,
    data: EstudianteUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        estudiante_actual = await service.obtener_estudiante(db, id_estudiante=id_estudiante)
        curso_objetivo = data.id_curso_actual if data.id_curso_actual is not None else estudiante_actual.id_curso_actual
        if curso_objetivo is not None:
            await validar_docente_puede_editar_curso(db, curso_objetivo, current_user.id_usuario, id_contexto)

    return await service.actualizar_estudiante(db, id_estudiante, data)


@router.delete("/{id_estudiante}", status_code=200)
async def eliminar_estudiante(
    id_estudiante: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_estudiantes(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        estudiante_actual = await service.obtener_estudiante(db, id_estudiante=id_estudiante)
        if estudiante_actual.id_curso_actual is not None:
            await validar_docente_puede_editar_curso(db, estudiante_actual.id_curso_actual, current_user.id_usuario, id_contexto)

    return await service.eliminar_estudiante(db, id_estudiante)   

