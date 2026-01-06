from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.comportamiento import (
    ComportamientoCreate,
    ComportamientoUpdate,
    ComportamientoResponse
)
from app.services import comportamiento as service

router = APIRouter(
    tags=["Comportamiento"]
)


@router.post("/", response_model=ComportamientoResponse)
async def crear_comportamiento(
    data: ComportamientoCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_comportamiento(db, data)


@router.get("/", response_model=list[ComportamientoResponse])
async def listar_comportamientos(
    id_estudiante: int | None = Query(None),
    id_curso: int | None = Query(None),
    mes: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_comportamientos(
        db=db,
        id_estudiante=id_estudiante,
        id_curso=id_curso,
        mes=mes,
        page=page,
        size=size
    )


@router.get("/{id_comportamiento}", response_model=ComportamientoResponse)
async def obtener_comportamiento(
    id_comportamiento: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_comportamiento(db, id_comportamiento)


@router.put("/{id_comportamiento}", response_model=ComportamientoResponse)
async def actualizar_comportamiento(
    id_comportamiento: int,
    data: ComportamientoUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_comportamiento(
        db,
        id_comportamiento,
        data
    )


@router.delete("/{id_comportamiento}", status_code=200)
async def eliminar_comportamiento(
    id_comportamiento: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_comportamiento(db, id_comportamiento)
