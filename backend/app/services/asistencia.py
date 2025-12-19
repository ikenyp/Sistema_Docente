from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asistencia import Asistencia
from app.crud import asistencia as crud
from app.schemas.asistencia import AsistenciaCreate, AsistenciaUpdate, EstadoAsistencia


# Crear asistencia
async def crear_asistencia(db: AsyncSession, data: AsistenciaCreate):

    asistencia = Asistencia(
        id_cmd=data.id_cmd,
        id_estudiante=data.id_estudiante,
        fecha=data.fecha,
        estado=data.estado
    )

    return await crud.crear(db, asistencia)


# Listar asistencias
async def listar_asistencias(
    db: AsyncSession,
    id_cmd: int | None,
    id_estudiante: int | None,
    fecha,
    estado: EstadoAsistencia | None,
    page: int,
    size: int
):
    # Paginación
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_asistencias(
        db=db,
        id_cmd=id_cmd,
        id_estudiante=id_estudiante,
        fecha=fecha,
        estado=estado,
        page=page,
        size=size
    )


# Obtener asistencia
async def obtener_asistencia(db: AsyncSession, id_asistencia: int):
    asistencia = await crud.obtener_por_id(db, id_asistencia)

    if not asistencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asistencia no encontrada"
        )

    return asistencia


# Actualizar asistencia
async def actualizar_asistencia(
    db: AsyncSession,
    id_asistencia: int,
    data: AsistenciaUpdate
):
    asistencia = await obtener_asistencia(db, id_asistencia)

    values = data.model_dump(exclude_unset=True)

    for key, value in values.items():
        setattr(asistencia, key, value)

    return await crud.actualizar(db, asistencia)

# Eliminar asistencia
async def eliminar_asistencia(db: AsyncSession, id_asistencia: int):
    asistencia = await obtener_asistencia(db, id_asistencia)

    await crud.eliminar(db, asistencia)

    return {"message": "Asistencia eliminada correctamente"}
