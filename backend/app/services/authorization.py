"""
Servicio de autorización para validar permisos de usuarios.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.usuarios import Usuario
from app.models.cursos import Curso
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.schemas.usuarios import RolUsuarioEnum


async def validar_docente_puede_editar_curso(
    db: AsyncSession,
    id_curso: int,
    id_docente: int
):
    """
    Valida que un docente sea el tutor del curso.
    
    Args:
        db: Sesión de base de datos
        id_curso: ID del curso a validar
        id_docente: ID del usuario (docente)
    
    Raises:
        HTTPException: Si el docente no es tutor del curso
    """
    curso = await db.execute(
        select(Curso).where(Curso.id_curso == id_curso)
    )
    curso_obj = curso.scalar_one_or_none()
    
    if not curso_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El curso no existe"
        )
    
    if curso_obj.id_tutor != id_docente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el tutor del curso puede realizar esta acción"
        )
    
    return curso_obj


async def validar_docente_imparte_materia_en_curso(
    db: AsyncSession,
    id_curso: int,
    id_docente: int,
    id_materia: int | None = None
):
    """
    Valida que un docente imparte (o puede imparte) una materia en un curso.
    
    Args:
        db: Sesión de base de datos
        id_curso: ID del curso
        id_docente: ID del docente
        id_materia: ID de la materia (opcional, si se proporciona hace validación específica)
    
    Raises:
        HTTPException: Si el docente no imparte en ese curso
    """
    query = select(CursoMateriaDocente).where(
        CursoMateriaDocente.id_curso == id_curso,
        CursoMateriaDocente.id_docente == id_docente
    )
    
    if id_materia:
        query = query.where(CursoMateriaDocente.id_materia == id_materia)
    
    result = await db.execute(query)
    cmd = result.scalar_one_or_none()
    
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El docente no imparte esta materia en el curso"
        )
    
    return cmd


async def validar_admin_solo_lectura(
    current_user: Usuario,
    accion: str = "lectura"
):
    """
    Valida que un admin solo puede hacer lectura en ciertos recursos.
    
    Args:
        current_user: Usuario actual
        accion: Tipo de acción (lectura, escritura, eliminación)
    
    Raises:
        HTTPException: Si es admin e intenta algo que no sea lectura
    """
    if current_user.rol == RolUsuarioEnum.administrativo and accion != "lectura":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores solo tienen acceso de lectura en este recurso"
        )
    
    return True
