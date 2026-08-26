from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.cursos_materias_docentes import (
    CMDCreate,
    CMDUpdate,
    CMDResponse,
    CMDResponseDetailed,
)
from app.services import cursos_materias_docentes as service
from app.auth.dependencies import get_current_user
from app.schemas.usuarios import RolUsuarioEnum
from app.models.usuarios import Usuario
from app.services.authorization import (
    validar_docente_puede_editar_curso,
    validar_usuario_puede_ver_cmd,
    validar_usuario_puede_ver_curso,
)

router = APIRouter(
    tags=["Cursos - Materias - Docentes"]
)


def _validar_gestion_cmd(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar asignaciones"
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar asignaciones"
        )


@router.post("/", response_model=CMDResponseDetailed)
async def crear_cmd(
    data: CMDCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_cmd(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        await validar_docente_puede_editar_curso(db, data.id_curso, current_user.id_usuario, id_contexto)
        data = data.model_copy(update={"id_docente": current_user.id_usuario})

    return await service.crear_cmd(db, data, id_contexto)


@router.get("/", response_model=list[CMDResponseDetailed])
async def listar_cmd(
    id_curso: int | None = Query(None),
    id_materia: int | None = Query(None),
    id_docente: int | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if current_user.rol == RolUsuarioEnum.docente:
        id_docente = current_user.id_usuario
    elif current_user.rol != RolUsuarioEnum.administrativo:
        if id_curso is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes filtrar por curso para listar asignaciones",
            )
        await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)

    return await service.listar_cmd(
        db=db,
        id_curso=id_curso,
        id_materia=id_materia,
        id_docente=id_docente,
        id_contexto=id_contexto,
        page=page,
        size=size
    )


@router.get("/{id_cmd}", response_model=CMDResponseDetailed)
async def obtener_cmd(
    id_cmd: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    await validar_usuario_puede_ver_cmd(db, id_cmd, current_user, id_contexto)
    return await service.obtener_cmd(db, id_cmd, id_contexto)


@router.put("/{id_cmd}", response_model=CMDResponseDetailed)
async def actualizar_cmd(
    id_cmd: int,
    data: CMDUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_cmd(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        actual = await service.obtener_cmd(db, id_cmd, id_contexto)
        id_curso_validar = data.id_curso if data.id_curso is not None else actual.id_curso
        await validar_docente_puede_editar_curso(db, id_curso_validar, current_user.id_usuario, id_contexto)
        data = data.model_copy(update={"id_docente": current_user.id_usuario})

    return await service.actualizar_cmd(db, id_cmd, data, id_contexto)


@router.delete("/{id_cmd}", status_code=200)
async def eliminar_cmd(
    id_cmd: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_cmd(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        actual = await service.obtener_cmd(db, id_cmd, id_contexto)
        await validar_docente_puede_editar_curso(db, actual.id_curso, current_user.id_usuario, id_contexto)

    return await service.eliminar_cmd(db, id_cmd, id_contexto)
