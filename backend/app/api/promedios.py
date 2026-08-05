"""
Endpoints para obtener promedios de estudiantes
"""

from fastapi import APIRouter, Depends, Query, Path, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.context_manager import resolve_contexto_id
from app.auth.dependencies import get_current_user
from app.services import promedios as service
from app.schemas.promedios import PromedioPeriodo, PromedioAcumulado, PromediosCurso
from app.models.usuarios import Usuario
from app.schemas.usuarios import RolUsuarioEnum
from app.services.authorization import (
    validar_usuario_puede_ver_curso,
    validar_usuario_puede_ver_estudiante,
)

router = APIRouter(
    prefix="/promedios",
    tags=["Promedios"],
    responses={404: {"description": "No encontrado"}}
)


@router.get(
    "/periodo/{id_estudiante}/{id_curso}/{numero_periodo}",
    response_model=PromedioPeriodo,
    summary="Obtener promedio de un periodo de un estudiante"
)
async def obtener_promedio_periodo(
    id_estudiante: int = Path(..., gt=0, description="ID del estudiante"),
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    numero_periodo: int = Path(..., ge=1, description="Numero de periodo"),
    anio_lectivo: str = Query(..., description="Ano lectivo (ej: 2025-2026)"),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
        await validar_usuario_puede_ver_estudiante(db, id_estudiante, current_user, id_contexto)
    return await service.calcular_promedio_periodo(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        numero_periodo=numero_periodo,
        anio_lectivo=anio_lectivo
    )


@router.get(
    "/acumulado/{id_estudiante}/{id_curso}",
    response_model=PromedioAcumulado,
    summary="Obtener promedio acumulado de un estudiante"
)
async def obtener_promedio_acumulado(
    id_estudiante: int = Path(..., gt=0, description="ID del estudiante"),
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    anio_lectivo: str = Query(..., description="Ano lectivo (ej: 2025-2026)"),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
        await validar_usuario_puede_ver_estudiante(db, id_estudiante, current_user, id_contexto)
    return await service.calcular_promedio_final(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        anio_lectivo=anio_lectivo
    )


@router.get(
    "/curso/{id_curso}",
    summary="Obtener promedios de todos los estudiantes en un curso"
)
async def obtener_promedios_curso(
    id_curso: int = Path(..., gt=0, description="ID del curso"),
    numero_periodo: int | None = Query(None, ge=1, description="Filtrar por periodo (opcional)"),
    anio_lectivo: str | None = Query(None, description="Ano lectivo (requerido si se especifica periodo)"),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Obtiene los promedios de todos los estudiantes matriculados en un curso.
    
    Si se especifica `numero_periodo`, filtra por periodo especifico.
    Si no se especifica, retorna promedios acumulados del ano.
    """
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
    promedios = await service.obtener_promedios_curso(
        db=db,
        id_contexto=id_contexto,
        id_curso=id_curso,
        numero_periodo=numero_periodo,
        anio_lectivo=anio_lectivo
    )
    
    return {
        "id_curso": id_curso,
        "promedios": promedios,
        "cantidad_estudiantes": len(promedios)
    }
