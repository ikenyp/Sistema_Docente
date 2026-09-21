from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.core.database import get_session
from app.models.usuarios import Usuario
from app.schemas.analisis import AnalisisCursoResponse, AnalisisEstudianteResponse
from app.services.analisis_academico import analizar_curso, analizar_estudiante
from app.services.authorization import (
    validar_docente_puede_editar_curso,
    validar_usuario_puede_ver_estudiante,
    validar_usuario_puede_ver_curso,
)
from app.schemas.usuarios import RolUsuarioEnum
from app.services.cursos import obtener_curso


router = APIRouter(tags=["Análisis académico"])


@router.get("/curso/{id_curso}", response_model=AnalisisCursoResponse)
async def obtener_analisis_curso(
    id_curso: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Devuelve indicadores y alertas de solo lectura para un curso autorizado."""
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo and is_personal_mode(request):
        await validar_docente_puede_editar_curso(
            db, id_curso, current_user.id_usuario, id_contexto
        )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
    curso = await obtener_curso(db, id_curso, id_contexto)
    return await analizar_curso(db, curso)


@router.get("/curso/{id_curso}/estudiante/{id_estudiante}", response_model=AnalisisEstudianteResponse)
async def obtener_analisis_estudiante(
    id_curso: int,
    id_estudiante: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Devuelve el detalle analítico de un estudiante visible en el curso."""
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo and is_personal_mode(request):
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
    elif current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)
    await validar_usuario_puede_ver_estudiante(db, id_estudiante, current_user, id_contexto)
    curso = await obtener_curso(db, id_curso, id_contexto)
    resultado = await analizar_estudiante(db, curso, id_estudiante)
    if resultado is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El estudiante no pertenece al curso")
    return resultado
