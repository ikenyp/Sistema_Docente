from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.estudiantes import Estudiante
from app.schemas.estudiantes import EstadoEstudiante  


#  Obtener por ID
async def obtener_por_id(db: AsyncSession, id_estudiante: int):
    result = await db.execute(
        select(Estudiante).where(
            Estudiante.id_estudiante == id_estudiante,
            Estudiante.eliminado == False
        )
    )
    return result.scalar_one_or_none()


#  Obtener por cédula
async def obtener_por_cedula(db: AsyncSession, cedula: str):
    result = await db.execute(
        select(Estudiante).where(
            Estudiante.cedula == cedula,
            Estudiante.eliminado == False
        )
    )
    return result.scalar_one_or_none()


#  Listar estudiantes
async def listar_estudiantes(
    db: AsyncSession,
    estado: EstadoEstudiante | None,
    page: int,
    size: int
):
    query = select(Estudiante).where(Estudiante.eliminado == False)

    if estado:
        query = query.where(Estudiante.estado == estado)

    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    return result.scalars().all()


#  Crear
async def crear(db: AsyncSession, estudiante: Estudiante):
    db.add(estudiante)
    await db.commit()
    await db.refresh(estudiante)
    return estudiante


#  Actualizar
async def actualizar(db: AsyncSession, estudiante: Estudiante):
    await db.commit()
    await db.refresh(estudiante)
    return estudiante

