from sqlalchemy import select, func, distinct, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.materias import Materia
from app.models.cursos import Curso
from app.models.cursos_materias_docentes import CursoMateriaDocente


# Obtener por ID
async def obtener_por_id(
    db: AsyncSession,
    id_materia: int,
    id_contexto: int | None = None,
    incluir_eliminadas: bool = False,
):
    condiciones = [
        Materia.id_materia == id_materia,
    ]
    if id_contexto is not None:
        condiciones.append(Materia.id_contexto == id_contexto)
    if not incluir_eliminadas:
        condiciones.append(Materia.eliminado == False)

    result = await db.execute(
        select(Materia).where(*condiciones)
    )
    return result.scalar_one_or_none()


# Obtener por nombre
async def obtener_por_nombre(db: AsyncSession, nombre: str, id_contexto: int):
    result = await db.execute(
        select(Materia).where(
            Materia.id_contexto == id_contexto,
            Materia.nombre == nombre,
            Materia.eliminado == False
        )
    )
    return result.scalar_one_or_none()


async def obtener_por_codigo(db: AsyncSession, codigo: str, id_contexto: int):
    result = await db.execute(
        select(Materia).where(
            Materia.id_contexto == id_contexto,
            Materia.codigo == codigo,
            Materia.eliminado == False,
        )
    )
    return result.scalar_one_or_none()


# Listar materias
async def listar_materias(
    db: AsyncSession,
    id_contexto: int,
    nombre: str | None = None,
    codigo: str | None = None,
    incluir_eliminadas: bool = False,
    page: int = 1,
    size: int = 10
):
    query = select(Materia).where(
        Materia.id_contexto == id_contexto,
    )

    if not incluir_eliminadas:
        query = query.where(Materia.eliminado == False)

    if nombre:
        query = query.where(Materia.nombre.ilike(f"%{nombre}%"))
    if codigo:
        query = query.where(Materia.codigo.ilike(f"%{codigo}%"))

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


async def listar_catalogo_materias(db: AsyncSession, id_contexto: int):
    uso_total = func.count(distinct(Curso.id_curso)).label("uso_total")
    query = (
        select(
            Materia,
            uso_total,
        )
        .outerjoin(CursoMateriaDocente, CursoMateriaDocente.id_materia == Materia.id_materia)
        .outerjoin(
            Curso,
            and_(
                Curso.id_curso == CursoMateriaDocente.id_curso,
                Curso.id_contexto == id_contexto,
            ),
        )
        .where(
            Materia.eliminado == False,
            Materia.id_contexto == id_contexto,
        )
        .group_by(
            Materia.id_materia,
            Materia.codigo,
            Materia.nombre,
            Materia.descripcion,
            Materia.id_contexto,
            Materia.eliminado,
        )
        .order_by(uso_total.desc(), Materia.nombre.asc())
    )

    result = await db.execute(query)
    return result.all()


# Crear
async def crear(db: AsyncSession, materia: Materia):
    try:
        db.add(materia)
        await db.commit()
        await db.refresh(materia)
        return materia
    except IntegrityError:
        await db.rollback()
        raise


# Actualizar
async def actualizar(db: AsyncSession, materia: Materia):
    try:
        await db.commit()
        await db.refresh(materia)
        return materia
    except IntegrityError:
        await db.rollback()
        raise


# Eliminar (física)
async def eliminar(db: AsyncSession, materia: Materia):
    await db.delete(materia)
    await db.commit()
