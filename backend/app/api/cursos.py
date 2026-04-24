from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.cursos import CursoCreate, CursoUpdate, CursoResponse
from app.services import cursos as service
from app.auth.dependencies import get_current_user
from app.schemas.usuarios import RolUsuarioEnum
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Cursos"]
)


def _validar_gestion_cursos(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar cursos"
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar cursos"
        )

# Crear un nuevo curso (solo admin)
@router.post("/", response_model=CursoResponse)
async def crear_curso(
    data: CursoCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_cursos(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        data = data.model_copy(update={"id_tutor": current_user.id_usuario})

    return await service.crear_curso(db, data, id_contexto)

# Listar cursos con filtros y paginación
@router.get("/", response_model=list[CursoResponse])
async def listar_cursos(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    nombre: str | None = Query(None, description="Filtrar por nombre del curso"),
    anio_lectivo: str | None = Query(None, description="Filtrar por grado o nivel educativo"),
    id_tutor: int | None = Query(None, description="Filtrar por tutor"),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request) and current_user.rol == RolUsuarioEnum.docente:
        id_tutor = current_user.id_usuario

    return await service.listar_cursos(db, id_contexto, page, size, nombre, anio_lectivo, id_tutor)

# Obtener curso por ID
@router.get("/{id_curso}", response_model=CursoResponse)
async def obtener_curso(
    id_curso: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request) and current_user.rol == RolUsuarioEnum.docente:
        from app.services.authorization import validar_docente_puede_editar_curso
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)

    return await service.obtener_curso(db, id_curso, id_contexto)

# Actualizar curso (solo admin o el tutor del curso)
@router.put("/{id_curso}", response_model=CursoResponse)
async def actualizar_curso(
    id_curso: int,
    data: CursoUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        _validar_gestion_cursos(current_user, request)
        data = data.model_copy(update={"id_tutor": current_user.id_usuario})

    # Solo admin o el tutor del curso pueden editar
    if current_user.rol != RolUsuarioEnum.administrativo:
        # Validar que sea el tutor del curso
        from app.services.authorization import validar_docente_puede_editar_curso
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
    
    return await service.actualizar_curso(db, id_curso, data, id_contexto)

# Eliminar curso (solo admin)
@router.delete("/{id_curso}", status_code=200)
async def eliminar_curso(
    id_curso: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        _validar_gestion_cursos(current_user, request)
        from app.services.authorization import validar_docente_puede_editar_curso
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden eliminar cursos"
        )

    return await service.eliminar_curso(db, id_curso, id_contexto)
