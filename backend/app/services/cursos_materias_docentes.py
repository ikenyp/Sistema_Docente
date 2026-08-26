from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso
from app.models.estructuras_academicas import EstructuraMateria
from app.models.insumos import Insumo
from app.models.materias import Materia
from app.models.usuarios import Usuario
from app.models.enums import RolUsuarioEnum
from app.crud import cursos_materias_docentes as crud
from app.schemas.cursos_materias_docentes import CMDCreate, CMDUpdate


# Crear asignación Curso–Materia–Docente
async def crear_cmd(db: AsyncSession, data: CMDCreate, id_contexto: int):
    # Validar que el curso exista
    curso = await db.execute(
        select(Curso).where(
            Curso.id_curso == data.id_curso,
            Curso.id_contexto == id_contexto,
        )
    )
    curso_obj = curso.scalar_one_or_none()
    if not curso_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El curso no existe"
        )

    # Validar que la materia exista
    materia = await db.execute(
        select(Materia).where(
            Materia.id_materia == data.id_materia,
            Materia.id_contexto == id_contexto,
            Materia.eliminado == False,
        )
    )
    if not materia.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La materia no existe"
        )

    if curso_obj.id_estructura_academica is not None:
        estructura_materia = await db.execute(
            select(EstructuraMateria).where(
                EstructuraMateria.id_estructura_academica == curso_obj.id_estructura_academica,
                EstructuraMateria.id_materia == data.id_materia,
            )
        )
        if not estructura_materia.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La materia no pertenece a la estructura académica del curso",
            )

    # Validar que el docente exista y tenga rol de DOCENTE
    docente = await db.execute(
        select(Usuario).where(Usuario.id_usuario == data.id_docente)
    )
    docente_obj = docente.scalar_one_or_none()
    if not docente_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El docente no existe"
        )
    
    if docente_obj.rol != RolUsuarioEnum.docente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene rol de docente"
        )

    # Validar que no exista ya curso + materia + docente
    # Validar que no exista ya una asignación para ese curso + materia
    existente_cm = await crud.obtener_por_curso_materia(db, data.id_curso, data.id_materia)
    if existente_cm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un docente asignado para esta materia en el curso"
        )

    cmd = CursoMateriaDocente(
        id_curso=data.id_curso,
        id_materia=data.id_materia,
        id_docente=data.id_docente
    )

    created = await crud.crear(db, cmd)
    # Return the created object with related entities loaded
    return await crud.obtener_por_id(db, created.id_cmd, id_contexto)


# Listar asignaciones
async def listar_cmd(
    db: AsyncSession,
    id_curso: int | None,
    id_materia: int | None,
    id_docente: int | None,
    id_contexto: int,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_cmd(
        db=db,
        id_curso=id_curso,
        id_materia=id_materia,
        id_docente=id_docente,
        id_contexto=id_contexto,
        page=page,
        size=size
    )


# Obtener asignación
async def obtener_cmd(db: AsyncSession, id_cmd: int, id_contexto: int | None = None):
    cmd = await crud.obtener_por_id(db, id_cmd, id_contexto)

    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada"
        )

    return cmd


# Actualizar asignación
async def actualizar_cmd(
    db: AsyncSession,
    id_cmd: int,
    data: CMDUpdate,
    id_contexto: int,
):
    cmd = await obtener_cmd(db, id_cmd, id_contexto)

    values = data.model_dump(exclude_unset=True)

    # Validar que el nuevo curso exista si se modifica
    if "id_curso" in values:
        curso = await db.execute(
            select(Curso).where(
                Curso.id_curso == values["id_curso"],
                Curso.id_contexto == id_contexto,
            )
        )
        curso_obj = curso.scalar_one_or_none()
        if not curso_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El curso no existe"
            )
    else:
        curso_obj = cmd.curso

    # Validar que la nueva materia exista si se modifica
    if "id_materia" in values:
        materia = await db.execute(
            select(Materia).where(
                Materia.id_materia == values["id_materia"],
                Materia.id_contexto == id_contexto,
                Materia.eliminado == False,
            )
        )
        if not materia.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La materia no existe"
            )

    id_materia_validar = values.get("id_materia", cmd.id_materia)
    if curso_obj and curso_obj.id_estructura_academica is not None:
        estructura_materia = await db.execute(
            select(EstructuraMateria).where(
                EstructuraMateria.id_estructura_academica == curso_obj.id_estructura_academica,
                EstructuraMateria.id_materia == id_materia_validar,
            )
        )
        if not estructura_materia.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La materia no pertenece a la estructura académica del curso",
            )

    # Validar que el nuevo docente exista y tenga rol de DOCENTE si se modifica
    if "id_docente" in values:
        docente = await db.execute(
            select(Usuario).where(Usuario.id_usuario == values["id_docente"])
        )
        docente_obj = docente.scalar_one_or_none()
        if not docente_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El docente no existe"
            )
        
        if docente_obj.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no tiene rol de docente"
            )

    # Validar unicidad por curso + materia (solo un docente por materia en un curso)
    if "id_curso" in values or "id_materia" in values or "id_docente" in values:
        id_curso = values.get("id_curso", cmd.id_curso)
        id_materia = values.get("id_materia", cmd.id_materia)

        existente = await crud.obtener_por_curso_materia(
            db, id_curso, id_materia
        )

        if existente and existente.id_cmd != cmd.id_cmd:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un docente asignado para esta materia en el curso"
            )

    for key, value in values.items():
        setattr(cmd, key, value)

    await crud.actualizar(db, cmd)
    # Return updated object with relations
    return await crud.obtener_por_id(db, cmd.id_cmd, id_contexto)


# Eliminar asignación (eliminación física)
async def eliminar_cmd(db: AsyncSession, id_cmd: int, id_contexto: int):
    cmd = await obtener_cmd(db, id_cmd, id_contexto)
    insumos_existentes = await db.execute(
        select(Insumo.id_insumo).where(Insumo.id_cmd == id_cmd).limit(1)
    )
    if insumos_existentes.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede quitar la materia porque ya tiene insumos asociados",
        )

    await crud.eliminar(db, id_cmd)
