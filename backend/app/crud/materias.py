from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.materias import Materia


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_materia: int):
    result = await db.execute(
        select(Materia).where(
            Materia.id_materia == id_materia,
            Materia.eliminado == False
        )
    )
    return result.scalar_one_or_none()


# Obtener por nombre
async def obtener_por_nombre(db: AsyncSession, nombre: str):
    result = await db.execute(
        select(Materia).where(
            Materia.nombre == nombre,
            Materia.eliminado == False
        )
    )
    return result.scalar_one_or_none()


# Listar materias
async def listar_materias(
    db: AsyncSession,
    nombre: str | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Materia).where(Materia.eliminado == False)

    if nombre:
        query = query.where(Materia.nombre.ilike(f"%{nombre}%"))

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, materia: Materia):
    db.add(materia)
    await db.commit()
    await db.refresh(materia)
    return materia


# Actualizar
async def actualizar(db: AsyncSession, materia: Materia):
    await db.commit()
    await db.refresh(materia)
    return materia