from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comportamiento import Comportamiento
from app.crud import comportamiento as crud
from app.schemas.comportamiento import (
    ComportamientoCreate,
    ComportamientoUpdate
)


# Crear comportamiento
async def crear_comportamiento(db: AsyncSession, data: ComportamientoCreate):

    # Validar unicidad estudiante + curso + mes
    if await crud.obtener_por_estudiante_curso_mes(
        db,
        data.id_estudiante,
        data.id_curso,
        data.mes
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un registro de comportamiento para este estudiante, curso y mes"
        )

    comportamiento = Comportamiento(
        id_estudiante=data.id_estudiante,
        id_curso=data.id_curso,
        mes=data.mes,
        valor=data.valor,
        observaciones=data.observaciones
    )

    return await crud.crear(db, comportamiento)


# Listar comportamientos
async def listar_comportamientos(
    db: AsyncSession,
    id_estudiante: int | None,
    id_curso: int | None,
    mes: str | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_comportamientos(
        db=db,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        mes=mes,
        page=page,
        size=size
    )


# Obtener comportamiento
async def obtener_comportamiento(db: AsyncSession, id_comportamiento: int):
    comportamiento = await crud.obtener_por_id(db, id_comportamiento)

    if not comportamiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de comportamiento no encontrado"
        )

    return comportamiento


# Actualizar comportamiento
async def actualizar_comportamiento(
    db: AsyncSession,
    id_comportamiento: int,
    data: ComportamientoUpdate
):
    comportamiento = await obtener_comportamiento(db, id_comportamiento)

    values = data.model_dump(exclude_unset=True)

    # Si cambia el mes → validar unicidad
    nuevo_mes = values.get("mes", comportamiento.mes)

    if nuevo_mes != comportamiento.mes:
        if await crud.obtener_por_estudiante_curso_mes(
            db,
            comportamiento.id_estudiante,
            comportamiento.id_curso,
            nuevo_mes
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un comportamiento para este estudiante, curso y mes"
            )

    for key, value in values.items():
        setattr(comportamiento, key, value)

    return await crud.actualizar(db, comportamiento)


# Eliminar comportamiento (físico)
async def eliminar_comportamiento(db: AsyncSession, id_comportamiento: int):
    comportamiento = await obtener_comportamiento(db, id_comportamiento)
    await crud.eliminar(db, comportamiento)
    return {"detail": "Comportamiento eliminado correctamente"}