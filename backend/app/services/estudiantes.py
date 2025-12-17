from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.estudiantes import Estudiante
from app.crud import estudiantes as crud
from app.schemas.estudiantes import EstudianteCreate, EstudianteUpdate, EstadoEstudiante

#  Crear estudiante
async def crear_estudiante(db: AsyncSession, data: EstudianteCreate):
    if await crud.obtener_por_cedula(db, data.cedula):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cédula ya está registrada"
        )

    estudiante = Estudiante(
        nombre=data.nombre,
        apellido=data.apellido,
        cedula=data.cedula,
        fecha_nacimiento=date.fromisoformat(data.fecha_nacimiento),
        estado=data.estado,
        id_curso_actual=data.id_curso_actual
    )

    return await crud.crear(db, estudiante)


#  Listar estudiantes
async def listar_estudiantes(
    db: AsyncSession,
    estado: str | None,
    page: int,
    size: int
):
    # Paginacion
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_estudiantes(db, estado, page, size)


#  Obtener estudiante
async def obtener_estudiante(db: AsyncSession, *,
    id_estudiante: int | None = None,
    cedula: str | None = None
):
    if id_estudiante is not None:
        estudiante = await crud.obtener_por_id(db, id_estudiante)
    elif cedula is not None:
        estudiante = await crud.obtener_por_cedula(db, cedula)
    else:
        raise ValueError("Debe enviar id_estudiante o cedula")

    if not estudiante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    return estudiante


#  Actualizar estudiante
async def actualizar_estudiante(
    db: AsyncSession,
    id_estudiante: int,
    data: EstudianteUpdate
):
    estudiante = await obtener_estudiante(db, id_estudiante=id_estudiante)

    values = data.model_dump(exclude_unset=True)

    for key, value in values.items():
        setattr(estudiante, key, value)

    return await crud.actualizar(db, estudiante)


#  Eliminar estudiante (eliminación lógica)
async def eliminar_estudiante(db: AsyncSession, id_estudiante: int):
    estudiante = await obtener_estudiante(db, id_estudiante=id_estudiante)

    # Validacion antes de eliminar
    if estudiante.estado == EstadoEstudiante.ACTIVO:
        raise HTTPException(
            status_code= status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar un estudiante activo"
        )

    estudiante.eliminado = True
    return await crud.actualizar(db, estudiante)
