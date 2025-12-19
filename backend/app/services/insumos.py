from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.insumos import Insumo
from app.crud import insumos as crud
from app.schemas.insumos import InsumoCreate, InsumoUpdate


# Crear insumo
async def crear_insumo(db: AsyncSession, data: InsumoCreate):

    # Validar ponderación (0 - 10)
    if not 0 <= data.ponderacion <= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ponderación debe estar entre 0 y 10"
        )

    # Validar que no exista el insumo en el mismo CMD
    if await crud.obtener_por_cmd_nombre(db, data.id_cmd, data.nombre):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un insumo con ese nombre en esta asignación"
        )

    insumo = Insumo(
        id_cmd=data.id_cmd,
        nombre=data.nombre,
        descripcion=data.descripcion,
        ponderacion=data.ponderacion,
        fecha_creacion=date.today()
    )

    return await crud.crear(db, insumo)


# Listar insumos
async def listar_insumos(
    db: AsyncSession,
    id_cmd: int | None,
    nombre: str | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_insumos(
        db=db,
        id_cmd=id_cmd,
        nombre=nombre,
        page=page,
        size=size
    )


# Obtener insumo
async def obtener_insumo(db: AsyncSession, id_insumo: int):
    insumo = await crud.obtener_por_id(db, id_insumo)

    if not insumo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado"
        )

    return insumo


# Actualizar insumo
async def actualizar_insumo(
    db: AsyncSession,
    id_insumo: int,
    data: InsumoUpdate
):
    insumo = await obtener_insumo(db, id_insumo)

    values = data.model_dump(exclude_unset=True)

    # Validar ponderación si se actualiza
    if "ponderacion" in values:
        if not 0 <= values["ponderacion"] <= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La ponderación debe estar entre 0 y 10"
            )

    # Validar unicidad si cambia el nombre
    if "nombre" in values:
        existente = await crud.obtener_por_cmd_nombre(
            db,
            insumo.id_cmd,
            values["nombre"]
        )
        if existente and existente.id_insumo != insumo.id_insumo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un insumo con ese nombre en esta asignación"
            )

    for key, value in values.items():
        setattr(insumo, key, value)

    return await crud.actualizar(db, insumo)


# Eliminar insumo (eliminación física)
async def eliminar_insumo(db: AsyncSession, id_insumo: int):
    insumo = await obtener_insumo(db, id_insumo)
    await crud.eliminar(db, insumo)
    return {"detail": "Insumo eliminado correctamente"}
