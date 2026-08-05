from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cursos import Curso
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.estudiantes import Estudiante
from app.models.insumos import Insumo
from app.models.notas import Nota
from app.models.asistencia import Asistencia
from app.models.comportamiento import Comportamiento
from app.models.contextos import Contexto
from app.schemas.usuarios import RolUsuarioEnum


async def _obtener_curso(
    db: AsyncSession,
    id_curso: int,
    id_contexto: int | None = None,
):
    query = select(Curso).where(Curso.id_curso == id_curso)
    if id_contexto is not None:
        query = query.where(Curso.id_contexto == id_contexto)
    result = await db.execute(query)
    curso = result.scalar_one_or_none()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El curso no existe",
        )
    return curso


async def validar_docente_puede_editar_curso(
    db: AsyncSession,
    id_curso: int,
    id_docente: int,
    id_contexto: int | None = None,
):
    curso = await _obtener_curso(db, id_curso, id_contexto)
    if curso.id_tutor != id_docente:
        contexto_result = await db.execute(
            select(Contexto).where(Contexto.id_contexto == curso.id_contexto)
        )
        contexto = contexto_result.scalar_one_or_none()
        if (
            contexto
            and contexto.tipo_modo == "personal"
            and contexto.id_owner_docente == id_docente
        ):
            return curso
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el tutor del curso o el dueño del contexto personal puede realizar esta acción",
        )
    return curso


async def validar_usuario_puede_ver_curso(
    db: AsyncSession,
    id_curso: int,
    current_user,
    id_contexto: int,
):
    curso = await _obtener_curso(db, id_curso, id_contexto)

    if current_user.rol == RolUsuarioEnum.administrativo:
        return curso

    if curso.id_tutor == current_user.id_usuario:
        return curso

    asignacion = await db.execute(
        select(CursoMateriaDocente).where(
            CursoMateriaDocente.id_curso == id_curso,
            CursoMateriaDocente.id_docente == current_user.id_usuario,
        )
    )
    if asignacion.scalar_one_or_none():
        return curso

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tiene acceso a este curso",
    )


async def validar_usuario_puede_editar_cmd(
    db: AsyncSession,
    id_cmd: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(CursoMateriaDocente)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(
            CursoMateriaDocente.id_cmd == id_cmd,
            Curso.id_contexto == id_contexto,
        )
    )
    cmd = result.scalar_one_or_none()
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La asignación curso-materia-docente no existe",
        )

    if current_user.rol == RolUsuarioEnum.administrativo:
        return cmd

    if cmd.id_docente != current_user.id_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el docente asignado puede modificar este recurso",
        )

    return cmd


async def validar_usuario_puede_ver_cmd(
    db: AsyncSession,
    id_cmd: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(CursoMateriaDocente)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(
            CursoMateriaDocente.id_cmd == id_cmd,
            Curso.id_contexto == id_contexto,
        )
    )
    cmd = result.scalar_one_or_none()
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La asignación curso-materia-docente no existe",
        )

    if current_user.rol == RolUsuarioEnum.administrativo:
        return cmd

    if cmd.id_docente == current_user.id_usuario:
        return cmd

    curso = await _obtener_curso(db, cmd.id_curso, id_contexto)
    if curso.id_tutor == current_user.id_usuario:
        return cmd

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tiene acceso a esta asignación",
    )


async def validar_usuario_puede_ver_estudiante(
    db: AsyncSession,
    id_estudiante: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(select(Estudiante).where(Estudiante.id_estudiante == id_estudiante))
    estudiante = result.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El estudiante no existe",
        )

    if current_user.rol == RolUsuarioEnum.administrativo:
        return estudiante

    if estudiante.id_curso_actual is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El estudiante no pertenece a un curso visible para el usuario",
        )

    await validar_usuario_puede_ver_curso(
        db,
        estudiante.id_curso_actual,
        current_user,
        id_contexto,
    )
    return estudiante


async def validar_usuario_puede_ver_insumo(
    db: AsyncSession,
    id_insumo: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(Insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Insumo.id_insumo == id_insumo, Curso.id_contexto == id_contexto)
    )
    insumo = result.scalar_one_or_none()
    if not insumo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado",
        )

    await validar_usuario_puede_ver_cmd(db, insumo.id_cmd, current_user, id_contexto)
    return insumo


async def validar_usuario_puede_editar_insumo(
    db: AsyncSession,
    id_insumo: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(Insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Insumo.id_insumo == id_insumo, Curso.id_contexto == id_contexto)
    )
    insumo = result.scalar_one_or_none()
    if not insumo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado",
        )

    await validar_usuario_puede_editar_cmd(db, insumo.id_cmd, current_user, id_contexto)
    return insumo


async def validar_usuario_puede_ver_nota(
    db: AsyncSession,
    id_nota: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(Nota)
        .join(Insumo, Insumo.id_insumo == Nota.id_insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Nota.id_nota == id_nota, Curso.id_contexto == id_contexto)
    )
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    await validar_usuario_puede_ver_insumo(db, nota.id_insumo, current_user, id_contexto)
    return nota


async def validar_usuario_puede_editar_nota(
    db: AsyncSession,
    id_nota: int,
    current_user,
    id_contexto: int,
):
    nota = await validar_usuario_puede_ver_nota(db, id_nota, current_user, id_contexto)
    await validar_usuario_puede_editar_insumo(db, nota.id_insumo, current_user, id_contexto)
    return nota


async def validar_usuario_puede_ver_asistencia(
    db: AsyncSession,
    id_asistencia: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(Asistencia)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Asistencia.id_cmd)
        .join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso)
        .where(Asistencia.id_asistencia == id_asistencia, Curso.id_contexto == id_contexto)
    )
    asistencia = result.scalar_one_or_none()
    if not asistencia:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    await validar_usuario_puede_ver_cmd(db, asistencia.id_cmd, current_user, id_contexto)
    return asistencia


async def validar_usuario_puede_editar_asistencia(
    db: AsyncSession,
    id_asistencia: int,
    current_user,
    id_contexto: int,
):
    asistencia = await validar_usuario_puede_ver_asistencia(db, id_asistencia, current_user, id_contexto)
    await validar_usuario_puede_editar_cmd(db, asistencia.id_cmd, current_user, id_contexto)
    return asistencia


async def validar_usuario_puede_ver_comportamiento(
    db: AsyncSession,
    id_comportamiento: int,
    current_user,
    id_contexto: int,
):
    result = await db.execute(
        select(Comportamiento)
        .join(Curso, Curso.id_curso == Comportamiento.id_curso)
        .where(Comportamiento.id_comportamiento == id_comportamiento, Curso.id_contexto == id_contexto)
    )
    comportamiento = result.scalar_one_or_none()
    if not comportamiento:
        raise HTTPException(status_code=404, detail="Registro de comportamiento no encontrado")
    await validar_usuario_puede_ver_curso(db, comportamiento.id_curso, current_user, id_contexto)
    return comportamiento


async def validar_usuario_puede_editar_comportamiento(
    db: AsyncSession,
    id_comportamiento: int,
    current_user,
    id_contexto: int,
):
    comportamiento = await validar_usuario_puede_ver_comportamiento(db, id_comportamiento, current_user, id_contexto)
    if current_user.rol != RolUsuarioEnum.administrativo:
        curso = await _obtener_curso(db, comportamiento.id_curso, id_contexto)
        if curso.id_tutor == current_user.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El tutor solo tiene acceso de lectura al comportamiento global del curso",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden modificar este comportamiento",
        )
    return comportamiento
