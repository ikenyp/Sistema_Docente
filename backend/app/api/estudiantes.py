from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Query

from app.core.database import get_session
from app.schemas.estudiantes import (
    EstudianteCreate,
    EstudianteUpdate,
    EstudianteResponse,
    EstadoEstudiante
)
from app.services import estudiantes as service

router = APIRouter(
    prefix="/estudiantes",
    tags=["Estudiantes"]
)

@router.post("/", response_model=EstudianteResponse)
async def crear_estudiante(
    data: EstudianteCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_estudiante(db, data)


@router.get("/", response_model=list[EstudianteResponse])
async def listar_estudiantes(
    estado: EstadoEstudiante | None = Query(None, description="Estado del estudiante"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_estudiantes(db, estado, page, size)


@router.get("/{id_estudiante}", response_model=EstudianteResponse)
async def obtener_estudiante(
    id_estudiante: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_estudiante(db, id_estudiante=id_estudiante)


@router.put("/{id_estudiante}", response_model=EstudianteResponse)
async def actualizar_estudiante(
    id_estudiante: int,
    data: EstudianteUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_estudiante(db, id_estudiante, data)


@router.delete("/{id_estudiante}", status_code=200)
async def eliminar_estudiante(
    id_estudiante: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_estudiante(db, id_estudiante)   

