from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cursos_materias_docentes import CursoMateriaDocente


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_cmd: int):
    result = await db.execute(
        select(CursoMateriaDocente).where(
            CursoMateriaDocente.id_cmd == id_cmd
        )
    )
    return result.scalar_one_or_none()


# Obtener por curso y materia (para validar unicidad)
async def obtener_por_curso_materia(
    db: AsyncSession,
    id_curso: int,
    id_materia: int
):
    result = await db.execute(
        select(CursoMateriaDocente).where(
            CursoMateriaDocente.id_curso == id_curso,
            CursoMateriaDocente.id_materia == id_materia
        )
    )
    return result.scalar_one_or_none()


# Listar asignaciones
async def listar_cmd(
    db: AsyncSession,
    id_curso: int | None = None,
    id_materia: int | None = None,
    id_docente: int | None = None,
    page: int = 1,
    size: int = 10
):
    query = select(CursoMateriaDocente)

    if id_curso is not None:
        query = query.where(CursoMateriaDocente.id_curso == id_curso)
    if id_materia is not None:
        query = query.where(CursoMateriaDocente.id_materia == id_materia)
    if id_docente is not None:
        query = query.where(CursoMateriaDocente.id_docente == id_docente)

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


# Crear
async def crear(db: AsyncSession, cmd: CursoMateriaDocente):
    db.add(cmd)
    await db.commit()
    await db.refresh(cmd)
    return cmd


# Actualizar
async def actualizar(db: AsyncSession, cmd: CursoMateriaDocente):
    await db.commit()
    await db.refresh(cmd)
    return cmd

# Eliminar (física)
async def eliminar(db: AsyncSession, cmd: CursoMateriaDocente):
    await db.delete(cmd)
    await db.commit()
