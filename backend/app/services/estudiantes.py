from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import estudiantes as crud
from app.schemas.estudiantes import EstudianteCreate, EstudianteUpdate

async def validar_cedula_unica(db, cedula: str, estudiante_id: int | None = None):
    estudiante = await crud.get_by_cedula(db, cedula)
    if estudiante and estudiante.id_estudiante != estudiante_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cédula ya está registrada"
        )

async def crear_estudiante(db: AsyncSession, data: EstudianteCreate):
    existente = await crud.get_by_cedula(db, data.cedula)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cédula ya está registrada"
        )

    return await crud.create(db, data)


async def listar_estudiantes(db: AsyncSession):
    return await crud.get_all(db)


async def obtener_estudiante(db: AsyncSession, id_estudiante: int):
    estudiante = await crud.get_by_id(db, id_estudiante)
    if not estudiante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )
    return estudiante


async def actualizar_estudiante(
    db: AsyncSession,
    id_estudiante: int,
    data: EstudianteUpdate
):
    estudiante = await crud.get_by_id(db, id_estudiante)
    if not estudiante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    return await crud.update_estudiante(db, id_estudiante, data)


async def eliminar_estudiante(db: AsyncSession, id_estudiante: int):
    estudiante = await crud.get_by_id(db, id_estudiante)
    if not estudiante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    # regla académica (ejemplo)
    if estudiante.estado == "activo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar un estudiante activo"
        )

    await crud.delete_estudiante(db, id_estudiante)
    return {"message": "Estudiante eliminado correctamente"}
