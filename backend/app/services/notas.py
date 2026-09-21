from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from datetime import date

from app.models.notas import Nota
from app.models.insumos import Insumo
from app.models.estudiantes import Estudiante
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso
from app.core.pagination import normalizar_paginacion
from app.crud import notas as crud
from app.schemas.notas import NotaCreate, NotaUpdate
from app.services.validaciones_academicas import validar_calificacion, validar_estudiante_en_curso
from app.services.validaciones_academicas import manejar_error_integridad


# Crear nota
async def crear_nota(db: AsyncSession, data: NotaCreate, id_contexto: int):

    # Validar rango de nota (0 - 10)
    validar_calificacion(data.calificacion)

    # Validar que el insumo exista
    insumo = await db.execute(
        select(Insumo)
        .options(selectinload(Insumo.cmd))
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Insumo.id_insumo == data.id_insumo, Curso.id_contexto == id_contexto)
    )
    insumo_obj = insumo.scalar_one_or_none()
    if not insumo_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El insumo no existe"
        )

    # Validar que el estudiante exista
    estudiante = await db.execute(
        select(Estudiante).where(
            Estudiante.id_estudiante == data.id_estudiante,
            Estudiante.id_contexto == id_contexto,
            Estudiante.eliminado.is_(False),
        )
    )
    estudiante_obj = estudiante.scalar_one_or_none()
    if not estudiante_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El estudiante no existe"
        )

    # VALIDACIÓN CRÍTICA: Estudiante debe estar en el curso del insumo
    validar_estudiante_en_curso(
        estudiante_obj,
        insumo_obj.cmd.id_curso,
        "El estudiante no está matriculado en el curso del insumo",
    )

    # Validar que no exista nota para ese estudiante + insumo
    if await crud.obtener_por_estudiante_insumo(
        db,
        id_estudiante=data.id_estudiante,
        id_insumo=data.id_insumo,
        id_contexto=id_contexto,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nota para este estudiante e insumo ya existe"
        )

    nota = Nota(
        id_estudiante=data.id_estudiante,
        id_insumo=data.id_insumo,
        calificacion=data.calificacion,
        fecha_asignacion=date.today()
    )

    try:
        return await crud.crear(db, nota)
    except IntegrityError:
        await manejar_error_integridad(db, "La nota para este estudiante e insumo ya existe")


# Listar notas
async def listar_notas(
    db: AsyncSession,
    id_contexto: int,
    id_estudiante: int | None = None,
    id_insumo: int | None = None,
    page: int = 1,
    size: int = 10
):
    page, size = normalizar_paginacion(page, size)

    return await crud.listar_notas(
        db=db,
        id_contexto=id_contexto,
        id_estudiante=id_estudiante,
        id_insumo=id_insumo,
        page=page,
        size=size
    )


# Obtener nota por ID
async def obtener_nota(db: AsyncSession, id_nota: int, id_contexto: int):
    nota = await crud.obtener_por_id(db, id_nota, id_contexto)

    if not nota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nota no encontrada"
        )

    return nota


# Actualizar nota
async def actualizar_nota(
    db: AsyncSession,
    id_nota: int,
    data: NotaUpdate,
    id_contexto: int,
):
    nota = await obtener_nota(db, id_nota, id_contexto)

    values = data.model_dump(exclude_unset=True)

    # Validar rango de nota si se actualiza
    if "calificacion" in values:
        validar_calificacion(values["calificacion"])

    # Validar que nuevo insumo exista si se modifica
    if "id_insumo" in values:
        insumo = await db.execute(
            select(Insumo)
            .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Insumo.id_insumo == values["id_insumo"], Curso.id_contexto == id_contexto)
        )
        if not insumo.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El insumo no existe"
            )

    # Validar que nuevo estudiante exista si se modifica
    if "id_estudiante" in values:
        est = await db.execute(
            select(Estudiante).where(
                Estudiante.id_estudiante == values["id_estudiante"],
                Estudiante.id_contexto == id_contexto,
                Estudiante.eliminado.is_(False),
            )
        )
        if not est.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El estudiante no existe"
            )

    # VALIDACIÓN CRÍTICA: Estudiante debe estar en curso del insumo si cambian
    nuevo_estudiante = values.get("id_estudiante", nota.id_estudiante)
    nuevo_insumo = values.get("id_insumo", nota.id_insumo)
    
    if "id_estudiante" in values or "id_insumo" in values:
        # Obtener el insumo actualizado
        insumo_actual = await db.execute(
            select(Insumo)
            .options(selectinload(Insumo.cmd))
            .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
            .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
            .where(Insumo.id_insumo == nuevo_insumo, Curso.id_contexto == id_contexto)
        )
        insumo_obj = insumo_actual.scalar_one_or_none()
        
        # Obtener el estudiante actualizado
        est_actual = await db.execute(
            select(Estudiante).where(
                Estudiante.id_estudiante == nuevo_estudiante,
                Estudiante.id_contexto == id_contexto,
                Estudiante.eliminado.is_(False),
            )
        )
        est_obj = est_actual.scalar_one_or_none()
        
        if est_obj and insumo_obj:
            validar_estudiante_en_curso(
                est_obj,
                insumo_obj.cmd.id_curso,
                "El estudiante no está matriculado en el curso del insumo",
            )

    # Validar unicidad si cambia estudiante o insumo
    if (
        nuevo_estudiante != nota.id_estudiante
        or nuevo_insumo != nota.id_insumo
    ):
        if await crud.obtener_por_estudiante_insumo(
            db,
            id_estudiante=nuevo_estudiante,
            id_insumo=nuevo_insumo,
            id_contexto=id_contexto,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una nota para este estudiante e insumo"
            )

    # Mapear campos schema → modelo
    if "id_estudiante" in values:
        nota.id_estudiante = values["id_estudiante"]
    if "id_insumo" in values:
        nota.id_insumo = values["id_insumo"]
    if "calificacion" in values:
        nota.calificacion = values["calificacion"]

    try:
        return await crud.actualizar(db, nota)
    except IntegrityError:
        await manejar_error_integridad(db, "Ya existe una nota para este estudiante e insumo")


# Eliminar nota (eliminación física)
async def eliminar_nota(db: AsyncSession, id_nota: int, id_contexto: int):
    nota = await obtener_nota(db, id_nota, id_contexto)
    await crud.eliminar(db, nota)
    return {"detail": "Nota eliminada correctamente"}

