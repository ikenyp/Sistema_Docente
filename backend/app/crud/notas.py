from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notas import Nota
from app.models.insumos import Insumo
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_nota: int, id_contexto: int | None = None):
    query = select(Nota).where(Nota.id_nota == id_nota)
    if id_contexto is not None:
        query = (
            query.join(Insumo, Insumo.id_insumo == Nota.id_insumo)
            .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Curso.id_contexto == id_contexto)
        )
    result = await db.execute(
        query
    )
    return result.scalar_one_or_none()


# Validar unicidad: estudiante + insumo
async def obtener_por_estudiante_insumo(
    db: AsyncSession,
    id_estudiante: int,
    id_insumo: int,
    id_contexto: int | None = None,
):
    query = select(Nota).where(
        Nota.id_estudiante == id_estudiante,
        Nota.id_insumo == id_insumo
    )
    if id_contexto is not None:
        query = (
            query.join(Insumo, Insumo.id_insumo == Nota.id_insumo)
            .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Curso.id_contexto == id_contexto)
        )
    result = await db.execute(
        query
    )
    return result.scalar_one_or_none()


# Listar notas (con paginación)
async def listar_notas(
    db: AsyncSession,
    id_contexto: int,
    id_estudiante: int | None = None,
    id_insumo: int | None = None,
    page: int = 1,
    size: int = 10
):
    query = (
        select(Nota)
        .join(Insumo, Insumo.id_insumo == Nota.id_insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Curso.id_contexto == id_contexto)
    )

    if id_estudiante:
        query = query.where(Nota.id_estudiante == id_estudiante)
    if id_insumo:
        query = query.where(Nota.id_insumo == id_insumo)

    # Aplicar paginación
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

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
