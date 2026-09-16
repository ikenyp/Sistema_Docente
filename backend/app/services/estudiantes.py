from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.estudiantes import Estudiante
from app.crud import estudiantes as crud
from app.crud import cursos as crud_cursos
from app.crud import anios_lectivos as crud_anios_lectivos
from app.core.pagination import normalizar_paginacion
from app.schemas.estudiantes import EstudianteCreate, EstudianteUpdate, EstadoEstudiante
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import logging


async def _validar_curso_en_anio_lectivo(
    db: AsyncSession,
    id_curso_actual: int | None,
    id_contexto: int,
    anio_lectivo: str | None,
):
    if id_curso_actual is None:
        return None

    curso = await crud_cursos.obtener_por_id(db, id_curso_actual, id_contexto)
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El curso seleccionado no existe en el contexto actual",
        )

    if anio_lectivo and curso.anio_lectivo != anio_lectivo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El curso seleccionado no pertenece al año lectivo activo",
        )

    return curso


async def _obtener_anio_lectivo_activo(db: AsyncSession, id_contexto: int) -> str:
    anio = await crud_anios_lectivos.obtener_activo(db, id_contexto)
    if not anio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay un año lectivo activo para este contexto",
        )
    return anio.anio_lectivo

#  Crear estudiante
async def crear_estudiante(db: AsyncSession, data: EstudianteCreate, id_contexto: int, anio_lectivo: str | None = None):
    anio_activo = anio_lectivo or await _obtener_anio_lectivo_activo(db, id_contexto)
    # Validar que cédula no esté registrada
    if await crud.obtener_por_cedula(db, data.cedula, id_contexto, anio_activo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cédula ya está registrada"
        )

    if data.fecha_nacimiento is not None:
        # Validar que fecha de nacimiento no sea futura
        if data.fecha_nacimiento > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de nacimiento no puede ser futura"
            )

        # Validar edad mínima (al menos 5 años)
        edad = (date.today() - data.fecha_nacimiento).days // 365
        if edad < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El estudiante debe tener al menos 5 años"
        )

    curso = await _validar_curso_en_anio_lectivo(db, data.id_curso_actual, id_contexto, anio_activo)
    anio_estudiante = anio_activo or (curso.anio_lectivo if curso else "")

    estudiante = Estudiante(
        nombre=data.nombre,
        apellido=data.apellido,
        cedula=data.cedula,
        id_contexto=id_contexto,
        anio_lectivo=anio_estudiante,
        fecha_nacimiento= data.fecha_nacimiento,
        estado=data.estado,
        id_curso_actual=data.id_curso_actual
    )

    try:
        return await crud.crear(db, estudiante)
    except IntegrityError as ie:
        logging.error("IntegrityError creando estudiante: %s", ie)
        detail = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error de integridad de datos: {detail}")
    except Exception as e:
        logging.error("Error inesperado creando estudiante: %s", e)
        logging.error(e, exc_info=True)
        raise


#  Listar estudiantes
async def listar_estudiantes(
    db: AsyncSession,
    id_contexto: int | None,
    anio_lectivo: str | None,
    estado: EstadoEstudiante | None,
    nombre: str | None,
    apellido: str | None,
    id_curso_actual: int | None,
    page: int,
    size: int
):
    page, size = normalizar_paginacion(page, size)

    return await crud.listar_estudiantes(
        db=db, 
        id_contexto=id_contexto,
        anio_lectivo=anio_lectivo,
        estado=estado, 
        nombre=nombre, 
        apellido=apellido, 
        id_curso_actual=id_curso_actual, 
        page=page, 
        size=size
    )


#  Obtener estudiante
async def obtener_estudiante(db: AsyncSession, *,
    id_estudiante: int | None = None,
    cedula: str | None = None,
    id_contexto: int | None = None,
    anio_lectivo: str | None = None,
):
    if id_contexto is not None and anio_lectivo is None:
        anio_lectivo = await _obtener_anio_lectivo_activo(db, id_contexto)
    if id_estudiante is not None:
        estudiante = await crud.obtener_por_id(db, id_estudiante, id_contexto, anio_lectivo)
    elif cedula is not None:
        estudiante = await crud.obtener_por_cedula(db, cedula, id_contexto, anio_lectivo)
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
    data: EstudianteUpdate,
    id_contexto: int | None = None,
    anio_lectivo: str | None = None,
):
    if id_contexto is not None and anio_lectivo is None:
        anio_lectivo = await _obtener_anio_lectivo_activo(db, id_contexto)

    estudiante = await obtener_estudiante(db, id_estudiante=id_estudiante, id_contexto=id_contexto, anio_lectivo=anio_lectivo)

    values = data.model_dump(exclude_unset=True)

    curso_objetivo = values.get("id_curso_actual", estudiante.id_curso_actual)
    curso = await _validar_curso_en_anio_lectivo(db, curso_objetivo, id_contexto, anio_lectivo)
    if curso is not None:
        estudiante.anio_lectivo = anio_lectivo or curso.anio_lectivo

    nueva_cedula = values.get("cedula")
    if nueva_cedula and nueva_cedula != estudiante.cedula:
        existente = await crud.obtener_por_cedula(db, nueva_cedula, id_contexto, anio_lectivo)
        if existente and existente.id_estudiante != estudiante.id_estudiante:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada en este contexto",
            )

    for key, value in values.items():
        setattr(estudiante, key, value)

    return await crud.actualizar(db, estudiante)


#  Eliminar estudiante (eliminación lógica)
async def eliminar_estudiante(db: AsyncSession, id_estudiante: int, id_contexto: int | None = None, anio_lectivo: str | None = None):
    if id_contexto is not None and anio_lectivo is None:
        anio_lectivo = await _obtener_anio_lectivo_activo(db, id_contexto)
    estudiante = await obtener_estudiante(db, id_estudiante=id_estudiante, id_contexto=id_contexto, anio_lectivo=anio_lectivo)

    # Validacion antes de eliminar
    if estudiante.estado == EstadoEstudiante.matriculado:
        raise HTTPException(
            status_code= status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar un estudiante activo"
        )

    estudiante.eliminado = True
    return await crud.actualizar(db, estudiante)
