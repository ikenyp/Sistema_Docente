from fastapi import HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud import estructuras_academicas as crud
from app.models.cursos import Curso
from app.models.anios_lectivos import AnioLectivo
from app.models.estructuras_academicas import EstructuraAcademica, EstructuraMateria
from app.services.materias import obtener_materia
from app.schemas.estructuras_academicas import (
    EstructuraAcademicaCreate,
    EstructuraAcademicaUpdate,
    EstructuraMateriaCreate,
)


def _normalizar_anio(anio_lectivo: str | None) -> str | None:
    if not anio_lectivo:
        return None
    anio = anio_lectivo.strip()
    return anio or None


async def _resolver_anio_lectivo(
    db: AsyncSession,
    id_contexto: int,
    request: Request | None = None,
) -> str | None:
    if request is not None:
        header_anio = _normalizar_anio(request.headers.get("x-anio-lectivo"))
        if header_anio:
            return header_anio

    result = await db.execute(
        select(AnioLectivo.anio_lectivo)
        .where(AnioLectivo.id_contexto == id_contexto)
        .order_by(desc(AnioLectivo.anio_lectivo))
        .limit(1)
    )
    return _normalizar_anio(result.scalar_one_or_none())


async def _copiar_estructuras_desde_anio_anterior(
    db: AsyncSession,
    id_contexto: int,
    anio_lectivo: str,
):
    result = await db.execute(
        select(EstructuraAcademica)
        .options(selectinload(EstructuraAcademica.materias).selectinload(EstructuraMateria.materia))
        .where(
            EstructuraAcademica.id_contexto == id_contexto,
            EstructuraAcademica.anio_lectivo != anio_lectivo,
        )
        .order_by(desc(EstructuraAcademica.anio_lectivo), EstructuraAcademica.id_estructura_academica.asc())
    )
    previas = result.scalars().all()
    if not previas:
        return

    anio_base = previas[0].anio_lectivo
    previas_base = [item for item in previas if item.anio_lectivo == anio_base]

    for estructura_prev in previas_base:
        existente = await crud.obtener_estructura_por_nombre(
            db,
            estructura_prev.nombre,
            id_contexto,
            anio_lectivo,
        )
        if existente:
            continue

        estructura_nueva = EstructuraAcademica(
            id_contexto=id_contexto,
            anio_lectivo=anio_lectivo,
            nombre=estructura_prev.nombre,
            nivel=estructura_prev.nivel,
            subnivel=estructura_prev.subnivel,
            modalidad=estructura_prev.modalidad,
            especialidad=estructura_prev.especialidad,
            activo=estructura_prev.activo,
        )
        db.add(estructura_nueva)
        await db.flush()

        for materia_prev in estructura_prev.materias:
            db.add(
                EstructuraMateria(
                    id_estructura_academica=estructura_nueva.id_estructura_academica,
                    id_materia=materia_prev.id_materia,
                    orden=materia_prev.orden,
                    obligatoria=materia_prev.obligatoria,
                )
            )

    await db.commit()


async def crear_estructura_academica(
    db: AsyncSession,
    data: EstructuraAcademicaCreate,
    id_contexto: int,
    anio_lectivo: str,
):
    if await crud.obtener_estructura_por_nombre(db, data.nombre, id_contexto, anio_lectivo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una estructura académica con ese nombre",
        )

    estructura = EstructuraAcademica(
        id_contexto=id_contexto,
        anio_lectivo=anio_lectivo,
        **data.model_dump(exclude_none=True, exclude={"anio_lectivo"}),
    )
    return await crud.crear_estructura(db, estructura)


async def listar_estructuras_academicas(
    db: AsyncSession,
    id_contexto: int,
    nombre: str | None,
    page: int,
    size: int,
    anio_lectivo: str | None,
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    anio_lectivo = _normalizar_anio(anio_lectivo)
    if not anio_lectivo:
        anio_lectivo = await _resolver_anio_lectivo(db, id_contexto)

    offset = (page - 1) * size
    estructuras = await crud.listar_estructuras(
        db,
        id_contexto,
        nombre,
        anio_lectivo,
        offset,
        size,
    )
    if estructuras or not anio_lectivo:
        return estructuras

    await _copiar_estructuras_desde_anio_anterior(db, id_contexto, anio_lectivo)
    return await crud.listar_estructuras(
        db,
        id_contexto,
        nombre,
        anio_lectivo,
        offset,
        size,
    )


async def obtener_estructura_academica(
    db: AsyncSession,
    id_estructura_academica: int,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    estructura = await crud.obtener_estructura_por_id(
        db,
        id_estructura_academica,
        id_contexto,
        anio_lectivo,
    )
    if not estructura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estructura académica no encontrada",
        )
    return estructura


async def actualizar_estructura_academica(
    db: AsyncSession,
    id_estructura_academica: int,
    data: EstructuraAcademicaUpdate,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    estructura = await obtener_estructura_academica(db, id_estructura_academica, id_contexto, anio_lectivo)
    values = data.model_dump(exclude_unset=True)

    if "nombre" in values:
        existente = await crud.obtener_estructura_por_nombre(
            db,
            values["nombre"],
            id_contexto,
            estructura.anio_lectivo,
        )
        if existente and existente.id_estructura_academica != estructura.id_estructura_academica:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una estructura académica con ese nombre",
            )

    for key, value in values.items():
        setattr(estructura, key, value)

    return await crud.actualizar_estructura(db, estructura)


async def agregar_materia_a_estructura(
    db: AsyncSession,
    id_estructura_academica: int,
    data: EstructuraMateriaCreate,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto, anio_lectivo)
    await obtener_materia(db, data.id_materia, id_contexto)

    if await crud.obtener_estructura_materia(db, id_estructura_academica, data.id_materia):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La materia ya está asociada a esta estructura académica",
        )

    estructura_materia = EstructuraMateria(
        id_estructura_academica=id_estructura_academica,
        id_materia=data.id_materia,
        orden=data.orden,
        obligatoria=data.obligatoria,
    )
    return await crud.crear_estructura_materia(db, estructura_materia)


async def listar_materias_de_estructura(
    db: AsyncSession,
    id_estructura_academica: int,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto, anio_lectivo)
    return await crud.listar_estructura_materias(db, id_estructura_academica)


async def eliminar_materia_de_estructura(
    db: AsyncSession,
    id_estructura_academica: int,
    id_materia: int,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto, anio_lectivo)
    estructura_materia = await crud.obtener_estructura_materia(db, id_estructura_academica, id_materia)
    if not estructura_materia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La materia no está asociada a esta estructura académica",
        )
    await crud.eliminar_estructura_materia(db, estructura_materia)
    return {"detail": "Materia retirada de la estructura académica"}


async def eliminar_estructura_academica(
    db: AsyncSession,
    id_estructura_academica: int,
    id_contexto: int,
    anio_lectivo: str | None = None,
):
    estructura = await obtener_estructura_academica(db, id_estructura_academica, id_contexto, anio_lectivo)

    curso_existente = await db.execute(
        select(Curso.id_curso).where(Curso.id_estructura_academica == id_estructura_academica).limit(1)
    )
    if curso_existente.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la plantilla porque ya fue usada en un curso",
        )

    await crud.eliminar_estructura(db, estructura)
    return {"detail": "Plantilla académica eliminada"}
