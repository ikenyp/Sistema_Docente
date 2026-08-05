from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import estructuras_academicas as crud
from app.models.estructuras_academicas import EstructuraAcademica, EstructuraMateria
from app.services.materias import obtener_materia
from app.schemas.estructuras_academicas import (
    EstructuraAcademicaCreate,
    EstructuraAcademicaUpdate,
    EstructuraMateriaCreate,
)


async def crear_estructura_academica(
    db: AsyncSession,
    data: EstructuraAcademicaCreate,
    id_contexto: int,
):
    if await crud.obtener_estructura_por_nombre(db, data.nombre, id_contexto):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una estructura académica con ese nombre",
        )

    estructura = EstructuraAcademica(id_contexto=id_contexto, **data.model_dump())
    return await crud.crear_estructura(db, estructura)


async def listar_estructuras_academicas(
    db: AsyncSession,
    id_contexto: int,
    nombre: str | None,
    page: int,
    size: int,
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10
    offset = (page - 1) * size
    return await crud.listar_estructuras(db, id_contexto, nombre, offset, size)


async def obtener_estructura_academica(
    db: AsyncSession,
    id_estructura_academica: int,
    id_contexto: int,
):
    estructura = await crud.obtener_estructura_por_id(db, id_estructura_academica, id_contexto)
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
):
    estructura = await obtener_estructura_academica(db, id_estructura_academica, id_contexto)
    values = data.model_dump(exclude_unset=True)

    if "nombre" in values:
        existente = await crud.obtener_estructura_por_nombre(db, values["nombre"], id_contexto)
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
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto)
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
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto)
    return await crud.listar_estructura_materias(db, id_estructura_academica)


async def eliminar_materia_de_estructura(
    db: AsyncSession,
    id_estructura_academica: int,
    id_materia: int,
    id_contexto: int,
):
    await obtener_estructura_academica(db, id_estructura_academica, id_contexto)
    estructura_materia = await crud.obtener_estructura_materia(db, id_estructura_academica, id_materia)
    if not estructura_materia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La materia no está asociada a esta estructura académica",
        )
    await crud.eliminar_estructura_materia(db, estructura_materia)
    return {"detail": "Materia retirada de la estructura académica"}
