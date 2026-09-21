from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.comportamiento import Comportamiento
from app.models.estudiantes import Estudiante
from app.models.cursos import Curso
from app.models.configuracion_periodizacion import ConfiguracionPeriodizacion
from app.crud import comportamiento as crud
from app.schemas.comportamiento import (
    ComportamientoCreate,
    ComportamientoUpdate
)
from app.core.pagination import normalizar_paginacion
from app.services.validaciones_academicas import manejar_error_integridad, validar_estudiante_en_curso


async def _validar_periodo_configurado(
    db: AsyncSession, curso: Curso, periodo: str, id_contexto: int
):
    if not str(periodo).isdigit() or int(periodo) < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El periodo no es válido")
    config_result = await db.execute(
        select(ConfiguracionPeriodizacion).where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == curso.anio_lectivo,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existe una periodización configurada para este año lectivo",
        )
    cantidad = config.cantidad_periodos
    if int(periodo) > cantidad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El periodo debe estar entre 1 y {cantidad} para este año lectivo",
        )

# Crear comportamiento
async def crear_comportamiento(db: AsyncSession, data: ComportamientoCreate, id_contexto: int):
    # Validar que estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(
            Estudiante.id_estudiante == data.id_estudiante,
            Estudiante.id_contexto == id_contexto,
            Estudiante.eliminado.is_(False),
        )
    )
    estudiante_obj = estudiante.scalar_one_or_none()
    if not estudiante_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El estudiante no existe"
        )

    # Validar que curso exista
    curso_result = await db.execute(
        select(Curso).where(Curso.id_curso == data.id_curso, Curso.id_contexto == id_contexto)
    )
    curso_obj = curso_result.scalar_one_or_none()
    if not curso_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El curso no existe"
        )
    await _validar_periodo_configurado(db, curso_obj, data.periodo, id_contexto)

    validar_estudiante_en_curso(estudiante_obj, data.id_curso)

    # Validar unicidad estudiante + curso + periodo
    if await crud.obtener_por_estudiante_curso_periodo(
        db,
        data.id_estudiante,
        data.id_curso,
        data.periodo,
        id_contexto=id_contexto,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un registro de comportamiento para este estudiante, curso y periodo"
        )

    comportamiento = Comportamiento(
        id_estudiante=data.id_estudiante,
        id_curso=data.id_curso,
        periodo=data.periodo,
        valor=data.valor,
        observaciones=data.observaciones
    )

    try:
        return await crud.crear(db, comportamiento)
    except IntegrityError:
        await manejar_error_integridad(
            db,
            "Ya existe un registro de comportamiento para este estudiante, curso y periodo",
        )


# Listar comportamientos
async def listar_comportamientos(
    db: AsyncSession,
    id_contexto: int,
    id_estudiante: int | None,
    id_curso: int | None,
    periodo: str | None,
    page: int,
    size: int
):
    page, size = normalizar_paginacion(page, size)

    return await crud.listar_comportamientos(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        periodo=periodo,
        page=page,
        size=size
    )


# Obtener comportamiento
async def obtener_comportamiento(db: AsyncSession, id_comportamiento: int, id_contexto: int):
    comportamiento = await crud.obtener_por_id(db, id_comportamiento, id_contexto)

    if not comportamiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de comportamiento no encontrado"
        )

    return comportamiento


# Actualizar comportamiento
async def actualizar_comportamiento(
    db: AsyncSession,
    id_comportamiento: int,
    data: ComportamientoUpdate,
    id_contexto: int,
):
    comportamiento = await obtener_comportamiento(db, id_comportamiento, id_contexto)

    values = data.model_dump(exclude_unset=True)

    # Validar periodo si se actualiza.
    if "periodo" in values:
        curso_actual = await db.execute(
            select(Curso).where(Curso.id_curso == comportamiento.id_curso, Curso.id_contexto == id_contexto)
        )
        curso_obj = curso_actual.scalar_one_or_none()
        if curso_obj:
            await _validar_periodo_configurado(db, curso_obj, values["periodo"], id_contexto)

    # Validar que estudiante exista si se modifica
    if "id_estudiante" in values:
        est = await db.execute(
            select(Estudiante).where(
                Estudiante.id_estudiante == values["id_estudiante"],
                Estudiante.id_contexto == id_contexto,
                Estudiante.eliminado.is_(False),
            )
        )
        if not est.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El estudiante no existe"
            )

    # Validar que curso exista si se modifica
    if "id_curso" in values:
        cur = await db.execute(
            select(Curso).where(Curso.id_curso == values["id_curso"], Curso.id_contexto == id_contexto)
        )
        if not cur.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El curso no existe"
            )

    # Si cambia el periodo, estudiante o curso, validar unicidad.
    nuevo_periodo = values.get("periodo", comportamiento.periodo)
    nuevo_estudiante = values.get("id_estudiante", comportamiento.id_estudiante)
    nuevo_curso = values.get("id_curso", comportamiento.id_curso)

    if (
        nuevo_periodo != comportamiento.periodo
        or nuevo_estudiante != comportamiento.id_estudiante
        or nuevo_curso != comportamiento.id_curso
    ):
        estudiante_actual = await db.execute(
            select(Estudiante).where(
                Estudiante.id_estudiante == nuevo_estudiante,
                Estudiante.id_contexto == id_contexto,
                Estudiante.eliminado.is_(False),
            )
        )
        estudiante_obj = estudiante_actual.scalar_one_or_none()
        if not estudiante_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El estudiante no existe",
            )

        validar_estudiante_en_curso(estudiante_obj, nuevo_curso)

        existente = await crud.obtener_por_estudiante_curso_periodo(
            db,
            nuevo_estudiante,
            nuevo_curso,
            nuevo_periodo,
            id_contexto=id_contexto,
        )
        if existente and existente.id_comportamiento != comportamiento.id_comportamiento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un comportamiento para este estudiante, curso y periodo"
            )

    for key, value in values.items():
        setattr(comportamiento, key, value)

    return await crud.actualizar(db, comportamiento)


# Eliminar comportamiento (físico)
async def eliminar_comportamiento(db: AsyncSession, id_comportamiento: int, id_contexto: int):
    comportamiento = await obtener_comportamiento(db, id_comportamiento, id_contexto)
    await crud.eliminar(db, comportamiento)
    return {"detail": "Comportamiento eliminado correctamente"}
