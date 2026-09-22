from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.cursos import CursoCreate, CursoUpdate, CursoResponseDetailed, CursoDashboardResponse, CursoResumenResponse
from app.services import cursos as service
from app.auth.dependencies import get_current_user
from app.schemas.usuarios import RolUsuarioEnum
from app.schemas.periodizacion import ConfiguracionPeriodizacionResponse, PeriodoAcademicoResponse
from app.models.configuracion_periodizacion import ConfiguracionPeriodizacion
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.estructuras_academicas import EstructuraMateria
from app.models.estudiantes import Estudiante
from app.models.usuarios import Usuario
from app.models.cursos import Curso
from app.services.authorization import (
    validar_docente_puede_editar_curso,
    validar_usuario_puede_ver_curso,
)
from app.services.authorization_mode import validar_gestion_por_modo

router = APIRouter(
    tags=["Cursos"]
)


def _validar_gestion_cursos(current_user: Usuario, request: Request):
    validar_gestion_por_modo(current_user, request, "cursos")

# Crear un nuevo curso (solo admin)
@router.post("/", response_model=CursoResponseDetailed)
async def crear_curso(
    data: CursoCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_cursos(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if is_personal_mode(request):
        if data.id_tutor not in (None, current_user.id_usuario):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo puedes marcarte a ti mismo como tutor",
            )

    return await service.crear_curso(db, data, id_contexto)

# Listar cursos con filtros y paginación
@router.get("/", response_model=list[CursoResponseDetailed])
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

    # En modo personal, todos los cursos del contexto pertenecen al docente,
    # aunque alguno todavía no tenga tutor asignado.
    if is_personal_mode(request) and current_user.rol == RolUsuarioEnum.docente:
        id_tutor = None

    return await service.listar_cursos(db, id_contexto, page, size, nombre, anio_lectivo, id_tutor)


@router.get("/resumen", response_model=list[CursoResumenResponse])
async def resumir_cursos(
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    estudiantes = (
        select(Estudiante.id_curso_actual.label("id_curso"), func.count(Estudiante.id_estudiante).label("total"))
        .where(
            Estudiante.id_contexto == id_contexto,
            or_(Estudiante.eliminado.is_(False), Estudiante.eliminado.is_(None)),
        )
        .group_by(Estudiante.id_curso_actual)
        .subquery()
    )
    materias = (
        select(CursoMateriaDocente.id_curso.label("id_curso"), func.count(func.distinct(CursoMateriaDocente.id_materia)).label("total"))
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Curso.id_contexto == id_contexto)
        .group_by(CursoMateriaDocente.id_curso)
        .subquery()
    )
    query = (
        select(Curso, func.coalesce(estudiantes.c.total, 0), func.coalesce(materias.c.total, 0))
        .outerjoin(estudiantes, estudiantes.c.id_curso == Curso.id_curso)
        .outerjoin(materias, materias.c.id_curso == Curso.id_curso)
        .options(joinedload(Curso.tutor), joinedload(Curso.estructura_academica))
        .where(Curso.id_contexto == id_contexto)
        .limit(size)
        .offset((page - 1) * size)
    )
    result = await db.execute(query)
    return [
        {
            **CursoResponseDetailed.model_validate(curso).model_dump(),
            "total_estudiantes": total_estudiantes,
            "total_materias": total_materias,
        }
        for curso, total_estudiantes, total_materias in result.all()
    ]

# Obtener curso por ID
@router.get("/{id_curso}", response_model=CursoResponseDetailed)
async def obtener_curso(
    id_curso: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if current_user.rol != RolUsuarioEnum.administrativo:
        if is_personal_mode(request):
            await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
        else:
            await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)

    return await service.obtener_curso(db, id_curso, id_contexto)


@router.get("/{id_curso}/dashboard", response_model=CursoDashboardResponse)
async def obtener_dashboard_curso(
    id_curso: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)

    if current_user.rol != RolUsuarioEnum.administrativo:
        if is_personal_mode(request):
            await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
        else:
            await validar_usuario_puede_ver_curso(db, id_curso, current_user, id_contexto)

    curso = await service.obtener_curso(db, id_curso, id_contexto)

    estudiantes_result = await db.execute(
        select(Estudiante).where(
            Estudiante.id_curso_actual == id_curso,
            Estudiante.id_contexto == id_contexto,
            Estudiante.anio_lectivo == curso.anio_lectivo,
            or_(Estudiante.eliminado.is_(False), Estudiante.eliminado.is_(None)),
        )
    )
    estudiantes = estudiantes_result.scalars().all()

    asignaciones_result = await db.execute(
        select(CursoMateriaDocente)
        .options(
            joinedload(CursoMateriaDocente.curso),
            joinedload(CursoMateriaDocente.materia),
            joinedload(CursoMateriaDocente.docente),
        )
        .where(CursoMateriaDocente.id_curso == id_curso)
    )
    asignaciones = asignaciones_result.scalars().all()

    materias_estructura = []
    if curso.id_estructura_academica:
        materias_estructura_result = await db.execute(
            select(EstructuraMateria)
            .options(joinedload(EstructuraMateria.materia))
            .where(EstructuraMateria.id_estructura_academica == curso.id_estructura_academica)
            .order_by(EstructuraMateria.orden.asc(), EstructuraMateria.id_estructura_materia.asc())
        )
        materias_estructura = materias_estructura_result.scalars().all()

    periodizacion_serializada = None
    periodizacion_result = await db.execute(
        select(ConfiguracionPeriodizacion).where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == curso.anio_lectivo,
        )
    )
    periodizacion = periodizacion_result.scalar_one_or_none()
    if periodizacion:
        await db.refresh(periodizacion, attribute_names=["periodos"])
        periodizacion_serializada = ConfiguracionPeriodizacionResponse(
            id_config_periodizacion=periodizacion.id_config_periodizacion,
            id_contexto=periodizacion.id_contexto,
            anio_lectivo=periodizacion.anio_lectivo,
            tipo_periodizacion=periodizacion.tipo_periodizacion,
            cantidad_periodos=periodizacion.cantidad_periodos,
            nombre_periodo_singular=periodizacion.nombre_periodo_singular,
            activo=periodizacion.activo,
            completa=len(periodizacion.periodos) == periodizacion.cantidad_periodos,
            periodos=[
                PeriodoAcademicoResponse.model_validate(periodo)
                for periodo in periodizacion.periodos
            ],
        )

    return CursoDashboardResponse(
        curso=curso,
        estudiantes=estudiantes,
        asignaciones=asignaciones,
        materias_estructura=materias_estructura,
        periodizacion=periodizacion_serializada,
    )

# Actualizar curso (solo admin o el tutor del curso)
@router.put("/{id_curso}", response_model=CursoResponseDetailed)
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
        if data.id_tutor not in (None, current_user.id_usuario):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo puedes marcarte a ti mismo como tutor",
            )
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden editar cursos en modo institucional",
        )
    
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
        await validar_docente_puede_editar_curso(db, id_curso, current_user.id_usuario, id_contexto)
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden eliminar cursos"
        )

    return await service.eliminar_curso(db, id_curso, id_contexto)
