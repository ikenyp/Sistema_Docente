from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.materias import (
    MateriaCreate,
    MateriaUpdate,
    MateriaResponse
)
from app.services import materias as service

router = APIRouter(
    tags=["Materias"]
)


@router.post("/", response_model=MateriaResponse)
async def crear_materia(
    data: MateriaCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_materia(db, data)


@router.get("/", response_model=list[MateriaResponse])
async def listar_materias(
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_materias(
        db=db,
        nombre=nombre,
        page=page,
        size=size
    )


@router.get("/{id_materia}", response_model=MateriaResponse)
async def obtener_materia(
    id_materia: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_materia(db, id_materia)


@router.put("/{id_materia}", response_model=MateriaResponse)
async def actualizar_materia(
    id_materia: int,
    data: MateriaUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_materia(db, id_materia, data)


@router.delete("/{id_materia}", status_code=200)
async def eliminar_materia(
    id_materia: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_materia(db, id_materia)

