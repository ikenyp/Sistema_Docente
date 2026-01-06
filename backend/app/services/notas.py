from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.notas import Nota
from app.crud import notas as crud
from app.schemas.notas import NotaCreate, NotaUpdate


# Crear nota
async def crear_nota(db: AsyncSession, data: NotaCreate):

    # Validar rango de nota (0 - 10)
    if not 0 <= data.calificacion <= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nota debe estar entre 0 y 10"
        )

    # Validar que no exista nota para ese estudiante + insumo
    if await crud.obtener_por_estudiante_insumo(
        db,
        id_estudiante=data.id_estudiante,
        id_insumo=data.id_insumo
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nota para este estudiante e insumo ya existe"
        )

    nota = Nota(
        id_estudiante=data.id_estudiante,
        id_insumo=data.id_insumo,
        calificacion=data.calificacion,
        fecha_asignacion=date.today()
    )

    return await crud.crear(db, nota)


# Listar notas
async def listar_notas(
    db: AsyncSession,
    id_estudiante: int | None = None,
    id_insumo: int | None = None
):
    return await crud.listar_notas(
        db=db,
        id_estudiante=id_estudiante,
        id_insumo=id_insumo
    )


# Obtener nota por ID
async def obtener_nota(db: AsyncSession, id_nota: int):
    nota = await crud.obtener_por_id(db, id_nota)

    if not nota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nota no encontrada"
        )

    return nota


# Actualizar nota
async def actualizar_nota(
    db: AsyncSession,
    id_nota: int,
    data: NotaUpdate
):
    nota = await obtener_nota(db, id_nota)

    values = data.model_dump(exclude_unset=True)

    # Validar rango de nota si se actualiza
    if "calificacion" in values:
        if not 0 <= values["calificacion"] <= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nota debe estar entre 0 y 10"
            )

    # Validar unicidad si cambia estudiante o insumo
    nuevo_estudiante = values.get("id_estudiante", nota.id_estudiante)
    nuevo_insumo = values.get("id_insumo", nota.id_insumo)

    if (
        nuevo_estudiante != nota.id_estudiante
        or nuevo_insumo != nota.id_insumo
    ):
        if await crud.obtener_por_estudiante_insumo(
            db,
            id_estudiante=nuevo_estudiante,
            id_insumo=nuevo_insumo
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una nota para este estudiante e insumo"
            )

    # Mapear campos schema → modelo
    if "id_estudiante" in values:
        nota.id_estudiante = values["id_estudiante"]
    if "id_insumo" in values:
        nota.id_insumo = values["id_insumo"]
    if "calificacion" in values:
        nota.calificacion = values["calificacion"]

    return await crud.actualizar(db, nota)


# Eliminar nota (eliminación física)
async def eliminar_nota(db: AsyncSession, id_nota: int):
    nota = await obtener_nota(db, id_nota)
    await crud.eliminar(db, nota)
    return {"detail": "Nota eliminada correctamente"}

