from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.insumos import Insumo
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso
from app.models.enums import TipoInsumoEnum


# Obtener por ID
async def obtener_por_id(db: AsyncSession, id_insumo: int, id_contexto: int | None = None):
    query = select(Insumo).where(Insumo.id_insumo == id_insumo)
    if id_contexto is not None:
        query = (
            query.join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Curso.id_contexto == id_contexto)
        )
    result = await db.execute(
        query
    )
    return result.scalar_one_or_none()


# Obtener por cmd + nombre (validar unicidad)
async def obtener_por_cmd_nombre(
    db: AsyncSession,
    id_cmd: int,
    nombre: str,
    id_contexto: int | None = None,
):
    query = select(Insumo).where(
        Insumo.id_cmd == id_cmd,
        Insumo.nombre == nombre
    )
    if id_contexto is not None:
        query = (
            query.join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Curso.id_contexto == id_contexto)
        )
    result = await db.execute(
        query
    )
    return result.scalar_one_or_none()


# Validar que no exista proyecto/examen del mismo tipo en el periodo
async def obtener_por_cmd_periodo_tipo(
    db: AsyncSession,
    id_cmd: int,
    id_periodo: int,
    tipo_insumo: TipoInsumoEnum,
    id_insumo_excluir: int | None = None,
    id_contexto: int | None = None,
):
    """
    Verifica si ya existe un insumo del mismo tipo en el mismo periodo.
    """
    query = select(Insumo).where(
        Insumo.id_cmd == id_cmd,
        Insumo.id_periodo == id_periodo,
        Insumo.tipo_insumo == tipo_insumo
    )

    if id_contexto is not None:
        query = (
            query.join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Curso.id_contexto == id_contexto)
        )
    
    # Si estamos actualizando, excluir el insumo actual
    if id_insumo_excluir:
        query = query.where(Insumo.id_insumo != id_insumo_excluir)
    
    result = await db.execute(query)
    return result.scalar_one_or_none()


# Listar insumos
async def listar_insumos(
    db: AsyncSession,
    id_contexto: int,
    id_cmd: int | None = None,
    nombre: str | None = None,
    periodo: int | None = None,
    tipo_insumo: TipoInsumoEnum | None = None,
    page: int = 1,
    size: int = 10
):
    query = (
        select(Insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Curso.id_contexto == id_contexto)
    )

    if id_cmd is not None:
        query = query.where(Insumo.id_cmd == id_cmd)
    if nombre:
        query = query.where(Insumo.nombre.ilike(f"%{nombre}%"))
    if periodo is not None:
        query = query.where(Insumo.id_periodo == periodo)
    if tipo_insumo is not None:
        query = query.where(Insumo.tipo_insumo == tipo_insumo)

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
