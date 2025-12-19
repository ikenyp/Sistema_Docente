from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.insumos import Insumo


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_insumo: int):
    result = await db.execute(
        select(Insumo).where(Insumo.id_insumo == id_insumo)
    )
    return result.scalar_one_or_none()


# Obtener por cmd + nombre (validar unicidad)
async def obtener_por_cmd_nombre(
    db: AsyncSession,
    id_cmd: int,
    nombre: str
):
    result = await db.execute(
        select(Insumo).where(
            Insumo.id_cmd == id_cmd,
            Insumo.nombre == nombre
        )
    )
    return result.scalar_one_or_none()


# Listar insumos
async def listar_insumos(
    db: AsyncSession,
    id_cmd: int | None = None,
    nombre: str | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Insumo)

    if id_cmd is not None:
        query = query.where(Insumo.id_cmd == id_cmd)
    if nombre:
        query = query.where(Insumo.nombre.ilike(f"%{nombre}%"))

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, insumo: Insumo):
    db.add(insumo)
    await db.commit()
    await db.refresh(insumo)
    return insumo


# Actualizar
async def actualizar(db: AsyncSession, insumo: Insumo):
    await db.commit()
    await db.refresh(insumo)
    return insumo

# Eliminar (física)
async def eliminar(db: AsyncSession, insumo: Insumo):
    await db.delete(insumo)
    await db.commit()
