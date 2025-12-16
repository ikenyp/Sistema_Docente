from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from datetime import date

from app.models.estudiantes import Estudiante
from app.schemas.estudiantes import EstudianteCreate, EstudianteUpdate


#  Obtener por ID
async def get_by_id(db: AsyncSession, id_estudiante: int):
    result = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == id_estudiante)
    )
    return result.scalar_one_or_none()


#  Obtener por cédula
async def get_by_cedula(db: AsyncSession, cedula: str):
    result = await db.execute(
        select(Estudiante).where(Estudiante.cedula == cedula)
    )
    return result.scalar_one_or_none()


#  Listar estudiantes
async def listar_estudiantes(
    db: AsyncSession,
    estado: str | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(Estudiante).where(Estudiante.eliminado == False)

    if estado:
        query = query.where(Estudiante.estado == estado)

    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    return result.scalars().all()


#  Crear
async def create(db: AsyncSession, data: EstudianteCreate):
    estudiante = Estudiante(
        nombre=data.nombre,
        apellido=data.apellido,
        cedula=data.cedula,
        fecha_nacimiento=date.fromisoformat(data.fecha_nacimiento),
        estado=data.estado,
        id_curso_actual=data.id_curso_actual
    )
    db.add(estudiante)
    await db.commit()
    await db.refresh(estudiante)
    return estudiante


#  Actualizar
async def update_estudiante(db, id_estudiante: int, data):
    result = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == id_estudiante)
    )
    estudiante = result.scalar_one_or_none()

    if not estudiante:
        return None

    values = data.model_dump(exclude_unset=True)

    for key, value in values.items():
        setattr(estudiante, key, value)

    await db.commit()
    await db.refresh(estudiante)
    return estudiante


#  Eliminar
async def soft_delete(db: AsyncSession, id_estudiante: int):
    result = await db.execute(
        select(Estudiante).where(
            Estudiante.id_estudiante == id_estudiante,
            Estudiante.eliminado == False
        )
    )
    estudiante = result.scalar_one_or_none()

    if not estudiante:
        return None

    estudiante.eliminado = True
    await db.commit()
    await db.refresh(estudiante)
    return estudiante

