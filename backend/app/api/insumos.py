from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.insumos import (
    InsumoCreate,
    InsumoUpdate,
    InsumoResponse
)
from app.services import insumos as service

router = APIRouter(
    prefix="/insumos",
    tags=["Insumos"]
)


@router.post("/", response_model=InsumoResponse)
async def crear_insumo(
    data: InsumoCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_insumo(db, data)


@router.get("/", response_model=list[InsumoResponse])
async def listar_insumos(
    id_cmd: int | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_insumos(
        db=db,
        id_cmd=id_cmd,
        nombre=nombre,
        page=page,
        size=size
    )


@router.get("/{id_insumo}", response_model=InsumoResponse)
async def obtener_insumo(
    id_insumo: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_insumo(db, id_insumo)


@router.put("/{id_insumo}", response_model=InsumoResponse)
async def actualizar_insumo(
    id_insumo: int,
    data: InsumoUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_insumo(db, id_insumo, data)


@router.delete("/{id_insumo}", status_code=200)
async def eliminar_insumo(
    id_insumo: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_insumo(db, id_insumo)
