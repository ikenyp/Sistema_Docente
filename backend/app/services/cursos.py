from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cursos import Curso
from app.schemas.cursos import CursoCreate, CursoUpdate
from app.crud import cursos as crud

# Crear curso
async def crear_curso(db: AsyncSession, data: CursoCreate):
    curso = Curso(
        nombre=data.nombre,
        anio_lectivo=data.anio_lectivo,
        id_tutor=data.id_tutor
    )
    return await crud.crear(db, curso)

# Listar cursos con paginación
async def listar_cursos(db: AsyncSession, page: int = 1, size: int = 10, nombre: str | None = None, anio_lectivo: str | None = None, tutor_id: int | None = None):
    if page < 1: page = 1
    if size < 1 or size > 100: size = 10
    offset = (page - 1) * size
    return await crud.listar(db, nombre, anio_lectivo, tutor_id, offset, size)


# Obtener curso
async def obtener_curso(db: AsyncSession, id_curso: int):
    curso = await crud.obtener_por_id(db, id_curso)
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    return curso

# Actualizar curso
async def actualizar_curso(db: AsyncSession, id_curso: int, data: CursoUpdate):
    curso = await obtener_curso(db, id_curso)
    values = data.model_dump(exclude_unset=True)
    for key, value in values.items():
        setattr(curso, key, value)
    return await crud.actualizar(db, curso)

# Eliminar curso
async def eliminar_curso(db: AsyncSession, id_curso: int):
    curso = await obtener_curso(db, id_curso)
    return await crud.eliminar(db, curso)
