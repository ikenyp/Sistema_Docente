from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cursos import Curso
from app.models.usuarios import Usuario
from app.models.enums import RolUsuarioEnum
from app.schemas.cursos import CursoCreate, CursoUpdate
from app.crud import cursos as crud

# Crear curso
async def crear_curso(db: AsyncSession, data: CursoCreate):
    # Validar que el tutor exista y sea DOCENTE (solo si se proporciona)
    if data.id_tutor is not None:
        tutor = await db.execute(
            select(Usuario).where(Usuario.id_usuario == data.id_tutor)
        )
        tutor_obj = tutor.scalar_one_or_none()
        if not tutor_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El tutor no existe"
            )
        
        if tutor_obj.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El tutor debe tener rol de docente"
            )
        
        # VALIDACIÓN: El docente tutor debe imparter al menos una materia en el curso
        # (Esta validación se puede relajar según políticas de negocio)
        # Por ahora, permitimos que un docente sea tutor aunque no imparta
        # Si queremos ser estrictos, descomentar:
        # cmd = await db.execute(
        #     select(CursoMateriaDocente).where(
        #         CursoMateriaDocente.id_curso == data.id_curso,
        #         CursoMateriaDocente.id_docente == data.id_tutor
        #     )
        # )
        # if not cmd.scalar_one_or_none():
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail="El docente debe imparter al menos una materia en el curso"
        #     )

    # Validar que no exista curso con mismo nombre y año lectivo
    existente = await crud.obtener_por_nombre_anio(db, data.nombre, data.anio_lectivo)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un curso con ese nombre en ese año lectivo"
        )

    curso = Curso(
        nombre=data.nombre,
        anio_lectivo=data.anio_lectivo,
        id_tutor=data.id_tutor
    )
    return await crud.crear(db, curso)

# Listar cursos con paginación
async def listar_cursos(db: AsyncSession, page: int = 1, size: int = 10, nombre: str | None = None, anio_lectivo: str | None = None, tutor_id: int | None = None):
    if page < 1: page = 1
    if size < 1 or size > 100: size = 10
    offset = (page - 1) * size
    return await crud.listar(db, nombre, anio_lectivo, tutor_id, offset, size)


# Obtener curso
async def obtener_curso(db: AsyncSession, id_curso: int):
    curso = await crud.obtener_por_id(db, id_curso)
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    return curso

# Actualizar curso
async def actualizar_curso(db: AsyncSession, id_curso: int, data: CursoUpdate):
    curso = await obtener_curso(db, id_curso)
    values = data.model_dump(exclude_unset=True)

    # Validar que el nuevo tutor exista y sea DOCENTE si se modifica (solo si no es None)
    if "id_tutor" in values and values["id_tutor"] is not None:
        tutor = await db.execute(
            select(Usuario).where(Usuario.id_usuario == values["id_tutor"])
        )
        tutor_obj = tutor.scalar_one_or_none()
        if not tutor_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El tutor no existe"
            )
        
        if tutor_obj.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El tutor debe tener rol de docente"
            )
        
        # VALIDACIÓN MEJORADA: El docente debe imparter en el curso actual
        # (Comentado por defecto, descomentar si se requiere política estricta)
        # from app.models.cursos_materias_docentes import CursoMateriaDocente
        # cmd = await db.execute(
        #     select(CursoMateriaDocente).where(
        #         CursoMateriaDocente.id_curso == id_curso,
        #         CursoMateriaDocente.id_docente == values["id_tutor"]
        #     )
        # )
        # if not cmd.scalar_one_or_none():
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail="El docente debe imparter al menos una materia en el curso para ser tutor"
        #     )

    # Validar unicidad si cambia nombre o anio_lectivo
    if "nombre" in values or "anio_lectivo" in values:
        nombre = values.get("nombre", curso.nombre)
        anio = values.get("anio_lectivo", curso.anio_lectivo)
        
        existente = await crud.obtener_por_nombre_anio(db, nombre, anio)
        if existente and existente.id_curso != curso.id_curso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un curso con ese nombre en ese año lectivo"
            )

    for key, value in values.items():
        setattr(curso, key, value)
    return await crud.actualizar(db, curso)

# Eliminar curso
async def eliminar_curso(db: AsyncSession, id_curso: int):
    curso = await obtener_curso(db, id_curso)
    return await crud.eliminar(db, curso)
