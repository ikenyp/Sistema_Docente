from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asistencia import Asistencia
from app.schemas.asistencia import EstadoAsistencia


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_asistencia: int):
    result = await db.execute(
        select(Asistencia).where(
            Asistencia.id_asistencia == id_asistencia
        )
    )
    return result.scalar_one_or_none()


# Listar asistencias
async def listar_asistencias(
    db: AsyncSession,
    id_cmd: int | None = None,
    id_estudiante: int | None = None,
    fecha: str | None = None,
    estado: EstadoAsistencia | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Asistencia)

    if id_cmd:
        query = query.where(Asistencia.id_cmd == id_cmd)
    if id_estudiante:
        query = query.where(Asistencia.id_estudiante == id_estudiante)
    if fecha:
        query = query.where(Asistencia.fecha == fecha)
    if estado:
        query = query.where(Asistencia.estado == estado)

    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, asistencia: Asistencia):
    db.add(asistencia)
    await db.commit()
    await db.refresh(asistencia)
    return asistencia


# Actualizar
async def actualizar(db: AsyncSession, asistencia: Asistencia):
    await db.commit()
    await db.refresh(asistencia)
    return asistencia

# Eliminar (física)
async def eliminar(db: AsyncSession, asistencia: Asistencia):
    await db.delete(asistencia)
    await db.commit()