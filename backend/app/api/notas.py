from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.notas import (NotaCreate, NotaUpdate,NotaResponse)
from app.services import notas as service

router = APIRouter(
    tags=["Notas"]
)


@router.post("/", response_model=NotaResponse)
async def crear_nota(
    data: NotaCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_nota(db, data)


@router.get("/", response_model=list[NotaResponse])
async def listar_notas(
    id_estudiante: int | None = Query(None),
    id_insumo: int | None = Query(None),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_notas(
        db=db,
        id_estudiante=id_estudiante,
        id_insumo=id_insumo
    )


@router.get("/{id_nota}", response_model=NotaResponse)
async def obtener_nota(
    id_nota: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_nota(db, id_nota)


@router.put("/{id_nota}", response_model=NotaResponse)
async def actualizar_nota(
    id_nota: int,
    data: NotaUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_nota(db, id_nota, data)


@router.delete("/{id_nota}", status_code=200)
async def eliminar_nota(
    id_nota: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_nota(db, id_nota)
