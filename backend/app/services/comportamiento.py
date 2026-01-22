from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re

from app.models.comportamiento import Comportamiento
from app.models.estudiantes import Estudiante
from app.models.cursos import Curso
from app.crud import comportamiento as crud
from app.schemas.comportamiento import (
    ComportamientoCreate,
    ComportamientoUpdate
)

# Crear comportamiento
async def crear_comportamiento(db: AsyncSession, data: ComportamientoCreate):
    # Validar que mes tenga formato YYYY-MM
    if not re.match(r'^\d{4}-(0[1-9]|1[0-2])$', data.mes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mes debe tener formato YYYY-MM (ejemplo: 2026-01)"
        )

    # Validar que estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == data.id_estudiante)
    )
    if not estudiante.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El estudiante no existe"
        )

    # Validar que curso exista
    curso = await db.execute(
        select(Curso).where(Curso.id_curso == data.id_curso)
    )
    if not curso.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El curso no existe"
        )

    # Validar unicidad estudiante + curso + mes
    if await crud.obtener_por_estudiante_curso_mes(
        db,
        data.id_estudiante,
        data.id_curso,
        data.mes
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un registro de comportamiento para este estudiante, curso y mes"
        )

    comportamiento = Comportamiento(
        id_estudiante=data.id_estudiante,
        id_curso=data.id_curso,
        mes=data.mes,
        valor=data.valor,
        observaciones=data.observaciones
    )

    return await crud.crear(db, comportamiento)


# Listar comportamientos
async def listar_comportamientos(
    db: AsyncSession,
    id_estudiante: int | None,
    id_curso: int | None,
    mes: str | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_comportamientos(
        db=db,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        mes=mes,
        page=page,
        size=size
    )


# Obtener comportamiento
async def obtener_comportamiento(db: AsyncSession, id_comportamiento: int):
    comportamiento = await crud.obtener_por_id(db, id_comportamiento)

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
    data: ComportamientoUpdate
):
    comportamiento = await obtener_comportamiento(db, id_comportamiento)

    values = data.model_dump(exclude_unset=True)

    # Validar mes si se actualiza (formato YYYY-MM)
    if "mes" in values:
        import re
        if not re.match(r'^\d{4}-(0[1-9]|1[0-2])$', values["mes"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El mes debe estar en formato YYYY-MM"
            )

    # Validar que estudiante exista si se modifica
    if "id_estudiante" in values:
        est = await db.execute(
            select(Estudiante).where(Estudiante.id_estudiante == values["id_estudiante"])
        )
        if not est.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El estudiante no existe"
            )

    # Validar que curso exista si se modifica
    if "id_curso" in values:
        cur = await db.execute(
            select(Curso).where(Curso.id_curso == values["id_curso"])
        )
        if not cur.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El curso no existe"
            )

    # Si cambia el mes, estudiante o curso → validar unicidad
    nuevo_mes = values.get("mes", comportamiento.mes)
    nuevo_estudiante = values.get("id_estudiante", comportamiento.id_estudiante)
    nuevo_curso = values.get("id_curso", comportamiento.id_curso)

    if (
        nuevo_mes != comportamiento.mes
        or nuevo_estudiante != comportamiento.id_estudiante
        or nuevo_curso != comportamiento.id_curso
    ):
        existente = await crud.obtener_por_estudiante_curso_mes(
            db,
            nuevo_estudiante,
            nuevo_curso,
            nuevo_mes
        )
        if existente and existente.id_comportamiento != comportamiento.id_comportamiento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un comportamiento para este estudiante, curso y mes"
            )

    for key, value in values.items():
        setattr(comportamiento, key, value)

    return await crud.actualizar(db, comportamiento)


# Eliminar comportamiento (físico)
async def eliminar_comportamiento(db: AsyncSession, id_comportamiento: int):
    comportamiento = await obtener_comportamiento(db, id_comportamiento)
    await crud.eliminar(db, comportamiento)
    return {"detail": "Comportamiento eliminado correctamente"}