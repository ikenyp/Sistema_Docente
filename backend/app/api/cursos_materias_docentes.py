from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.cursos_materias_docentes import (
    CMDCreate,
    CMDUpdate,
    CMDResponse
)
from app.services import cursos_materias_docentes as service

router = APIRouter(
    prefix="/cursos-materias-docentes",
    tags=["Cursos - Materias - Docentes"]
)


@router.post("/", response_model=CMDResponse)
async def crear_cmd(
    data: CMDCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_cmd(db, data)


@router.get("/", response_model=list[CMDResponse])
async def listar_cmd(
    id_curso: int | None = Query(None),
    id_materia: int | None = Query(None),
    id_docente: int | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_cmd(
        db=db,
        id_curso=id_curso,
        id_materia=id_materia,
        id_docente=id_docente,
        page=page,
        size=size
    )


@router.get("/{id_cmd}", response_model=CMDResponse)
async def obtener_cmd(
    id_cmd: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_cmd(db, id_cmd)


@router.put("/{id_cmd}", response_model=CMDResponse)
async def actualizar_cmd(
    id_cmd: int,
    data: CMDUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_cmd(db, id_cmd, data)


@router.delete("/{id_cmd}", status_code=200)
async def eliminar_cmd(
    id_cmd: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_cmd(db, id_cmd)
