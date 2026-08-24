from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.anios_lectivos import AnioLectivo


async def obtener_por_id(db: AsyncSession, id_anio_lectivo: int, id_contexto: int):
    result = await db.execute(
        select(AnioLectivo).where(
            AnioLectivo.id_anio_lectivo == id_anio_lectivo,
            AnioLectivo.id_contexto == id_contexto,
        )
    )
    return result.scalar_one_or_none()


async def obtener_por_anio(db: AsyncSession, anio_lectivo: str, id_contexto: int):
    anio_normalizado = anio_lectivo.strip()
    result = await db.execute(
        select(AnioLectivo).where(
            AnioLectivo.id_contexto == id_contexto,
            AnioLectivo.anio_lectivo == anio_normalizado,
        )
    )
    return result.scalar_one_or_none()


async def listar(db: AsyncSession, id_contexto: int):
    result = await db.execute(
        select(AnioLectivo)
        .where(AnioLectivo.id_contexto == id_contexto)
        .order_by(AnioLectivo.anio_lectivo.desc())
    )
    return result.scalars().all()


async def crear(db: AsyncSession, anio: AnioLectivo):
    db.add(anio)
    await db.commit()
    await db.refresh(anio)
    return anio


async def actualizar(db: AsyncSession, anio: AnioLectivo):
    await db.commit()
    await db.refresh(anio)
    return anio


async def eliminar(db: AsyncSession, anio: AnioLectivo):
    await db.delete(anio)
    await db.commit()
