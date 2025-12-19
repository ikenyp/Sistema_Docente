from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notas import Nota


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_nota: int):
    result = await db.execute(
        select(Nota).where(Nota.id_nota == id_nota)
    )
    return result.scalar_one_or_none()


# Validar unicidad: estudiante + insumo
async def obtener_por_estudiante_insumo(
    db: AsyncSession,
    id_estudiante: int,
    id_insumo: int
):
    result = await db.execute(
        select(Nota).where(
            Nota.id_estudiante == id_estudiante,
            Nota.id_insumo == id_insumo
        )
    )
    return result.scalar_one_or_none()


# Listar notas (opcionalmente por estudiante o insumo)
async def listar_notas(
    db: AsyncSession,
    id_estudiante: int | None = None,
    id_insumo: int | None = None
):
    query = select(Nota)

    if id_estudiante:
        query = query.where(Nota.id_estudiante == id_estudiante)
    if id_insumo:
        query = query.where(Nota.id_insumo == id_insumo)

    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, nota: Nota):
    db.add(nota)
    await db.commit()
    await db.refresh(nota)
    return nota


# Actualizar
async def actualizar(db: AsyncSession, nota: Nota):
    await db.commit()
    await db.refresh(nota)
    return nota

# Eliminar
async def eliminar(db: AsyncSession, nota: Nota):
    await db.delete(nota)
    await db.commit()
