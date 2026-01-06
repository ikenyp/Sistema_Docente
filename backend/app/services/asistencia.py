from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from app.models.asistencia import Asistencia
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.estudiantes import Estudiante
from app.crud import asistencia as crud
from app.schemas.asistencia import AsistenciaCreate, AsistenciaUpdate, EstadoAsistencia


# Crear asistencia
async def crear_asistencia(db: AsyncSession, data: AsistenciaCreate):
    # Validar que CMD exista
    cmd = await db.execute(
        select(CursoMateriaDocente).where(CursoMateriaDocente.id_cmd == data.id_cmd)
    )
    cmd_obj = cmd.scalar_one_or_none()
    if not cmd_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La asignación curso-materia-docente no existe"
        )

    # Validar que estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(Estudiante.id_estudiante == data.id_estudiante)
    )
    estudiante_obj = estudiante.scalar_one_or_none()
    if not estudiante_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El estudiante no existe"
        )

    # VALIDACIÓN CRÍTICA: Estudiante debe estar en el curso del CMD
    if estudiante_obj.id_curso_actual != cmd_obj.id_curso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estudiante no está matriculado en el curso"
        )

    # Validar que fecha no sea futura
    if data.fecha > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de asistencia no puede ser futura"
        )

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

    # Validar que fecha no sea futura si se actualiza
    if "fecha" in values:
        if values["fecha"] > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de asistencia no puede ser futura"
            )

    # Validar que CMD exista si se modifica
    if "id_cmd" in values:
        cmd = await db.execute(
            select(CursoMateriaDocente).where(CursoMateriaDocente.id_cmd == values["id_cmd"])
        )
        if not cmd.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La asignación curso-materia-docente no existe"
            )

    # Validar que estudiante exista si se modifica
    if "id_estudiante" in values:
        est = await db.execute(
            select(Estudiante).where(Estudiante.id_estudiante == values["id_estudiante"])
        )
        if not est.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El estudiante no existe"
            )

    # VALIDACIÓN CRÍTICA: Estudiante debe estar en curso del CMD si cambian
    if "id_cmd" in values or "id_estudiante" in values:
        nuevo_cmd = values.get("id_cmd", asistencia.id_cmd)
        nuevo_est = values.get("id_estudiante", asistencia.id_estudiante)
        
        cmd_obj = await db.execute(
            select(CursoMateriaDocente).where(CursoMateriaDocente.id_cmd == nuevo_cmd)
        )
        cmd_actual = cmd_obj.scalar_one_or_none()
        
        est_obj = await db.execute(
            select(Estudiante).where(Estudiante.id_estudiante == nuevo_est)
        )
        est_actual = est_obj.scalar_one_or_none()
        
        if est_actual and cmd_actual and est_actual.id_curso_actual != cmd_actual.id_curso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El estudiante no está matriculado en el curso"
            )

    for key, value in values.items():
        setattr(asistencia, key, value)

    return await crud.actualizar(db, asistencia)

# Eliminar asistencia
async def eliminar_asistencia(db: AsyncSession, id_asistencia: int):
    asistencia = await obtener_asistencia(db, id_asistencia)

    await crud.eliminar(db, asistencia)

    return {"message": "Asistencia eliminada correctamente"}
