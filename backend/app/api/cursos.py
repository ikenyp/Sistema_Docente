from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.schemas.cursos import CursoCreate, CursoUpdate, CursoResponse
from app.services import cursos as service

router = APIRouter(
    prefix="/cursos",
    tags=["Cursos"]
)

# Crear un nuevo curso
@router.post("/", response_model=CursoResponse)
async def crear_curso(data: CursoCreate, db: AsyncSession = Depends(get_session)):
    return await service.crear_curso(db, data)

# Listar cursos con filtros y paginación
@router.get("/", response_model=list[CursoResponse])
async def listar_cursos(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    nombre: str | None = Query(None, description="Filtrar por nombre del curso"),
    anio_lectivo: str | None = Query(None, description="Filtrar por grado o nivel educativo"),
    id_docente: int | None = Query(None, description="Filtrar por docente"),
    id_tutor: int | None = Query(None, description="Filtrar por tutor"),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_cursos(db, page, size, nombre, anio_lectivo, id_docente, id_tutor)

# Obtener curso por ID
@router.get("/{id_curso}", response_model=CursoResponse)
async def obtener_curso(id_curso: int, db: AsyncSession = Depends(get_session)):
    return await service.obtener_curso(db, id_curso)

# Actualizar curso
@router.put("/{id_curso}", response_model=CursoResponse)
async def actualizar_curso(id_curso: int, data: CursoUpdate, db: AsyncSession = Depends(get_session)):
    return await service.actualizar_curso(db, id_curso, data)

# Eliminar curso
@router.delete("/{id_curso}", status_code=200)
async def eliminar_curso(id_curso: int, db: AsyncSession = Depends(get_session)):
    return await service.eliminar_curso(db, id_curso)
