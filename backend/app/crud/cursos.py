from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cursos import Curso

#  Obtener por ID
async def obtener_por_id(db: AsyncSession, id_curso: int):
    result = await db.execute(
        select(Curso).where(
            Curso.id_curso == id_curso,
        )
    )
    return result.scalar_one_or_none()

# Obtener por nombre y año lectivo (para validar unicidad)
async def obtener_por_nombre_anio(db: AsyncSession, nombre: str, anio_lectivo: str):
    result = await db.execute(
        select(Curso).where(
            Curso.nombre == nombre,
            Curso.anio_lectivo == anio_lectivo
        )
    )
    return result.scalar_one_or_none()

#  Listar cursos
async def listar(db: AsyncSession, nombre: str | None = None, anio_lectivo: str | None = None, tutor_id: int | None = None, offset: int = 0, limit: int = 10):
    query = select(Curso)
    
    if nombre:
        query = query.where(Curso.nombre.ilike(f"%{nombre}%"))
    if anio_lectivo:
        query = query.where(Curso.anio_lectivo.ilike(f"%{anio_lectivo}%"))
    if tutor_id is not None:
        query = query.where(Curso.id_tutor == tutor_id)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)

    return result.scalars().all()

#  Crear curso
async def crear(db: AsyncSession, curso: Curso):
    db.add(curso)
    await db.commit()
    await db.refresh(curso)
    return curso

# Actualizar curso
async def actualizar(db: AsyncSession, curso: Curso):
    await db.commit()
    await db.refresh(curso)
    return curso

# Eliminar curso 
async def eliminar(db: AsyncSession, curso: Curso):
    await db.delete(curso)
    await db.commit()