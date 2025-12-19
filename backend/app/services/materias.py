from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.materias import Materia
from app.crud import materias as crud
from app.schemas.materias import MateriaCreate, MateriaUpdate


# Crear materia
async def crear_materia(db: AsyncSession, data: MateriaCreate):
    if await crud.obtener_por_nombre(db, data.nombre):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La materia ya existe"
        )

    materia = Materia(
        nombre=data.nombre
    )

    return await crud.crear(db, materia)


# Listar materias
async def listar_materias(
    db: AsyncSession,
    nombre: str | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_materias(
        db=db,
        nombre=nombre,
        page=page,
        size=size
    )


# Obtener materia
async def obtener_materia(
    db: AsyncSession,
    id_materia: int
):
    materia = await crud.obtener_por_id(db, id_materia)

    if not materia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada"
        )

    return materia


# Actualizar materia
async def actualizar_materia(
    db: AsyncSession,
    id_materia: int,
    data: MateriaUpdate
):
    materia = await obtener_materia(db, id_materia)

    values = data.model_dump(exclude_unset=True)

    for key, value in values.items():
        setattr(materia, key, value)

    return await crud.actualizar(db, materia)


# Eliminar materia (eliminación lógica)
async def eliminar_materia(
    db: AsyncSession,
    id_materia: int
):
    materia = await obtener_materia(db, id_materia)

    # Si tiene relaciones futuras, aquí irían validaciones
    materia.eliminado = True

    return await crud.actualizar(db, materia)

