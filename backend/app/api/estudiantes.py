from fastapi import APIRouter, Depends, HTTPException, status, Request
import logging
import traceback
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
    tags=["Estudiantes"]
)

@router.post("/", response_model=EstudianteResponse)
async def crear_estudiante(
    data: EstudianteCreate,
    db: AsyncSession = Depends(get_session),
    request: Request = None
):
    # Log incoming data and auth header for debugging
    try:
        logging.debug("crear_estudiante headers: %s", request.headers.get("authorization") if request else None)
        logging.debug("crear_estudiante payload: %s", data.model_dump() if hasattr(data, 'model_dump') else dict(data))
    except Exception:
        logging.debug("No se pudo loggear request info")

    try:
        return await service.crear_estudiante(db, data)
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error en crear_estudiante: %s", e)
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor")


@router.get("/", response_model=list[EstudianteResponse])
async def listar_estudiantes(
    estado: EstadoEstudiante | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    apellido: str | None = Query(None, description="Búsqueda parcial por apellido"),
    id_curso: int | None = Query(None, description="Filtrar por curso actual"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_estudiantes(
        db=db,
        estado=estado,
        nombre=nombre,
        apellido=apellido,
        id_curso_actual=id_curso,
        page=page,
        size=size
    )



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

