from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estructuras_academicas import EstructuraAcademica, EstructuraMateria


async def obtener_estructura_por_id(
    db: AsyncSession,
    id_estructura_academica: int,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    query = select(EstructuraAcademica).where(
        EstructuraAcademica.id_estructura_academica == id_estructura_academica,
        EstructuraAcademica.id_contexto == id_contexto,
    )
    if anio_lectivo:
        query = query.where(EstructuraAcademica.anio_lectivo == anio_lectivo)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def obtener_estructura_por_nombre(
    db: AsyncSession,
    nombre: str,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    query = select(EstructuraAcademica).where(
        EstructuraAcademica.id_contexto == id_contexto,
        EstructuraAcademica.nombre == nombre,
    )
    if anio_lectivo:
        query = query.where(EstructuraAcademica.anio_lectivo == anio_lectivo)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def listar_estructuras(
    db: AsyncSession,
    id_contexto: int,
    nombre: str | None = None,
    anio_lectivo: str | None = None,
    offset: int = 0,
    limit: int = 10,
):
    query = select(EstructuraAcademica).where(EstructuraAcademica.id_contexto == id_contexto)
    if anio_lectivo:
        query = query.where(EstructuraAcademica.anio_lectivo == anio_lectivo)
    if nombre:
        query = query.where(EstructuraAcademica.nombre.ilike(f"%{nombre}%"))
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def crear_estructura(db: AsyncSession, estructura: EstructuraAcademica):
    db.add(estructura)
    await db.commit()
    await db.refresh(estructura)
    return estructura


async def actualizar_estructura(db: AsyncSession, estructura: EstructuraAcademica):
    await db.commit()
    await db.refresh(estructura)
    return estructura


async def eliminar_estructura(db: AsyncSession, estructura: EstructuraAcademica):
    await db.delete(estructura)
    await db.commit()
    return None


async def obtener_estructura_materia(
    db: AsyncSession,
    id_estructura_academica: int,
    id_materia: int,
):
    result = await db.execute(
        select(EstructuraMateria).where(
            EstructuraMateria.id_estructura_academica == id_estructura_academica,
            EstructuraMateria.id_materia == id_materia,
        ).options(selectinload(EstructuraMateria.materia))
    )
    return result.scalar_one_or_none()


async def listar_estructura_materias(db: AsyncSession, id_estructura_academica: int):
    result = await db.execute(
        select(EstructuraMateria)
        .options(selectinload(EstructuraMateria.materia))
        .where(EstructuraMateria.id_estructura_academica == id_estructura_academica)
        .order_by(EstructuraMateria.orden.asc(), EstructuraMateria.id_estructura_materia.asc())
    )
    return result.scalars().all()


async def crear_estructura_materia(db: AsyncSession, estructura_materia: EstructuraMateria):
    db.add(estructura_materia)
    await db.commit()
    await db.refresh(estructura_materia)
    result = await db.execute(
        select(EstructuraMateria)
        .options(selectinload(EstructuraMateria.materia))
        .where(EstructuraMateria.id_estructura_materia == estructura_materia.id_estructura_materia)
    )
    return result.scalar_one()


async def eliminar_estructura_materia(db: AsyncSession, estructura_materia: EstructuraMateria):
    await db.delete(estructura_materia)
    await db.commit()
