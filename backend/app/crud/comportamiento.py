from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comportamiento import Comportamiento


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_comportamiento: int):
    result = await db.execute(
        select(Comportamiento).where(
            Comportamiento.id_comportamiento == id_comportamiento
        )
    )
    return result.scalar_one_or_none()


# Obtener por estudiante + curso + mes (unicidad)
async def obtener_por_estudiante_curso_mes(
    db: AsyncSession,
    id_estudiante: int,
    id_curso: int,
    mes: str
):
    result = await db.execute(
        select(Comportamiento).where(
            Comportamiento.id_estudiante == id_estudiante,
            Comportamiento.id_curso == id_curso,
            Comportamiento.mes == mes
        )
    )
    return result.scalar_one_or_none()


# Listar comportamientos
async def listar_comportamientos(
    db: AsyncSession,
    id_estudiante: int | None = None,
    id_curso: int | None = None,
    mes: str | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Comportamiento)

    if id_estudiante:
        query = query.where(Comportamiento.id_estudiante == id_estudiante)
    if id_curso:
        query = query.where(Comportamiento.id_curso == id_curso)
    if mes:
        query = query.where(Comportamiento.mes == mes)

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, comportamiento: Comportamiento):
    db.add(comportamiento)
    await db.commit()
    await db.refresh(comportamiento)
    return comportamiento


# Actualizar
async def actualizar(db: AsyncSession, comportamiento: Comportamiento):
    await db.commit()
    await db.refresh(comportamiento)
    return comportamiento


# Eliminar (física)
async def eliminar(db: AsyncSession, comportamiento: Comportamiento):
    await db.delete(comportamiento)
    await db.commit()