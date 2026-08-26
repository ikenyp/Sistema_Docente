from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func

from app.models.materias import Materia
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.estructuras_academicas import EstructuraMateria
from app.crud import materias as crud
from app.schemas.materias import MateriaCreate, MateriaUpdate


# Crear materia
async def crear_materia(db: AsyncSession, data: MateriaCreate, id_contexto: int):
    nombre = data.nombre.strip()
    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre es obligatorio",
        )
    if await crud.obtener_por_nombre(db, nombre, id_contexto):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La materia ya existe"
        )

    codigo = (data.codigo or "").strip() or None
    if codigo and await crud.obtener_por_codigo(db, codigo, id_contexto):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una materia con ese código"
        )

    materia = Materia(
        codigo=codigo,
        nombre=nombre,
        descripcion=(data.descripcion or "").strip() or None,
        id_contexto=id_contexto,
    )

    try:
        return await crud.crear(db, materia)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una materia con ese código",
        ) from exc


# Listar materias
async def listar_materias(
    db: AsyncSession,
    id_contexto: int,
    nombre: str | None,
    codigo: str | None,
    incluir_eliminadas: bool,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_materias(
        db=db,
        id_contexto=id_contexto,
        nombre=nombre,
        codigo=codigo,
        incluir_eliminadas=incluir_eliminadas,
        page=page,
        size=size
    )


async def listar_catalogo_materias(db: AsyncSession, id_contexto: int):
    filas = await crud.listar_catalogo_materias(db, id_contexto)
    return [
        {
            "id_materia": materia.id_materia,
            "codigo": materia.codigo,
            "nombre": materia.nombre,
            "descripcion": materia.descripcion,
            "eliminado": materia.eliminado,
            "uso_total": int(uso_total or 0),
        }
        for materia, uso_total in filas
    ]


# Obtener materia
async def obtener_materia(
    db: AsyncSession,
    id_materia: int,
    id_contexto: int | None = None,
):
    materia = await crud.obtener_por_id(db, id_materia, id_contexto)

    if not materia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada"
        )

    return materia


# Actualizar materia
async def actualizar_materia(
    db: AsyncSession,
    id_materia: int,
    data: MateriaUpdate,
    id_contexto: int,
):
    materia = await obtener_materia(db, id_materia, id_contexto)

    values = data.model_dump(exclude_unset=True)

    if "nombre" in values:
        nombre = (values.get("nombre") or "").strip()
        if not nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre es obligatorio",
            )
        existente_nombre = await crud.obtener_por_nombre(db, nombre, id_contexto)
        if existente_nombre and existente_nombre.id_materia != materia.id_materia:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La materia ya existe",
            )
        values["nombre"] = nombre

    if "codigo" in values:
        codigo = (values.get("codigo") or "").strip() or None
        if codigo:
            existente = await crud.obtener_por_codigo(db, codigo, id_contexto)
            if existente and existente.id_materia != materia.id_materia:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe una materia con ese código",
                )
        values["codigo"] = codigo

    if "descripcion" in values:
        values["descripcion"] = (values.get("descripcion") or "").strip() or None

    for key, value in values.items():
        setattr(materia, key, value)
    try:
        return await crud.actualizar(db, materia)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una materia con ese código",
        ) from exc


# Eliminar materia (eliminación lógica)
async def eliminar_materia(
    db: AsyncSession,
    id_materia: int,
    id_contexto: int,
):
    materia = await crud.obtener_por_id(db, id_materia, id_contexto, incluir_eliminadas=True)

    if not materia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada",
        )

    uso_cmd = await db.execute(
        select(func.count()).select_from(CursoMateriaDocente).where(
            CursoMateriaDocente.id_materia == materia.id_materia,
        )
    )
    uso_estructura = await db.execute(
        select(func.count()).select_from(EstructuraMateria).where(
            EstructuraMateria.id_materia == materia.id_materia,
        )
    )

    if (uso_cmd.scalar_one() or 0) > 0 or (uso_estructura.scalar_one() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar porque la materia ya está en uso",
        )

    await crud.eliminar(db, materia)
    return {"detail": "Materia eliminada correctamente"}

