from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cursos import Curso
from app.models.contextos import Contexto
from app.models.estructuras_academicas import EstructuraAcademica
from app.models.usuarios import Usuario
from app.models.enums import RolUsuarioEnum
from app.schemas.cursos import CursoCreate, CursoUpdate
from app.crud import cursos as crud
from sqlalchemy import select
from app.models.notas import Nota
from app.models.insumos import Insumo
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso

# Compatibilidad con pruebas y validación puntual en memoria.
def validar_tutor_unico_por_contexto(curso_actual_id, id_tutor, cursos_existentes):
    for curso in cursos_existentes:
        if curso.id_curso != curso_actual_id and curso.id_tutor == id_tutor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El docente solo puede ser tutor de un curso",
            )


# Un tutor solo puede estar asignado a un curso por año lectivo dentro del mismo contexto.
async def _validar_tutor_unico_en_db(
    db: AsyncSession,
    id_contexto: int,
    id_tutor: int,
    anio_lectivo: str,
    curso_actual_id: int | None = None,
):
    query = select(Curso).where(
        Curso.id_contexto == id_contexto,
        Curso.anio_lectivo == anio_lectivo,
        Curso.id_tutor == id_tutor,
    )
    if curso_actual_id is not None:
        query = query.where(Curso.id_curso != curso_actual_id)

    result = await db.execute(query)
    curso_existente = result.scalar_one_or_none()
    if curso_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El docente solo puede ser tutor de un curso por año lectivo",
        )

# Crear curso
async def crear_curso(db: AsyncSession, data: CursoCreate, id_contexto: int):
    if data.id_estructura_academica is not None:
        estructura = await db.execute(
            select(EstructuraAcademica).where(
                EstructuraAcademica.id_estructura_academica == data.id_estructura_academica,
                EstructuraAcademica.id_contexto == id_contexto,
                EstructuraAcademica.activo == True,
            )
        )
        if not estructura.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La estructura académica no existe en el contexto actual",
            )

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

        await _validar_tutor_unico_en_db(
            db=db,
            id_contexto=id_contexto,
            id_tutor=data.id_tutor,
            anio_lectivo=data.anio_lectivo,
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
    existente = await crud.obtener_por_nombre_anio(db, data.nombre, data.anio_lectivo, id_contexto)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un curso con ese nombre en ese año lectivo"
        )

    curso = Curso(
        nombre=data.nombre,
        anio_lectivo=data.anio_lectivo,
        id_contexto=id_contexto,
        id_estructura_academica=data.id_estructura_academica,
        id_tutor=data.id_tutor
    )
    return await crud.crear(db, curso)

# Listar cursos con paginación
async def listar_cursos(
    db: AsyncSession,
    id_contexto: int,
    page: int = 1,
    size: int = 10,
    nombre: str | None = None,
    anio_lectivo: str | None = None,
    tutor_id: int | None = None,
):
    if page < 1: page = 1
    if size < 1 or size > 100: size = 10
    offset = (page - 1) * size
    return await crud.listar(db, id_contexto, nombre, anio_lectivo, tutor_id, offset, size)


# Obtener curso
async def obtener_curso(db: AsyncSession, id_curso: int, id_contexto: int | None = None):
    curso = await crud.obtener_por_id(db, id_curso, id_contexto)
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    return curso

# Actualizar curso
async def actualizar_curso(db: AsyncSession, id_curso: int, data: CursoUpdate, id_contexto: int):
    curso = await obtener_curso(db, id_curso, id_contexto)
    values = data.model_dump(exclude_unset=True)

    contexto_result = await db.execute(
        select(Contexto).where(Contexto.id_contexto == curso.id_contexto)
    )
    contexto = contexto_result.scalar_one_or_none()

    if "id_estructura_academica" in values and values["id_estructura_academica"] is not None:
        estructura = await db.execute(
            select(EstructuraAcademica).where(
                EstructuraAcademica.id_estructura_academica == values["id_estructura_academica"],
                EstructuraAcademica.id_contexto == id_contexto,
                EstructuraAcademica.activo == True,
            )
        )
        if not estructura.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La estructura académica no existe en el contexto actual",
            )

        if (
            contexto
            and contexto.tipo_modo == "personal"
            and values["id_estructura_academica"] != curso.id_estructura_academica
        ):
            existe_configuracion = await db.execute(
                select(CursoMateriaDocente.id_cmd).where(
                    CursoMateriaDocente.id_curso == curso.id_curso
                )
            )
            if existe_configuracion.first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No puedes cambiar la estructura académica porque el curso ya tiene materias o configuración académica asociada",
                )

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

        await _validar_tutor_unico_en_db(
            db=db,
            id_contexto=id_contexto,
            id_tutor=values["id_tutor"],
            anio_lectivo=values.get("anio_lectivo", curso.anio_lectivo),
            curso_actual_id=curso.id_curso,
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
        
        existente = await crud.obtener_por_nombre_anio(db, nombre, anio, id_contexto)
        if existente and existente.id_curso != curso.id_curso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un curso con ese nombre en ese año lectivo"
            )

    for key, value in values.items():
        setattr(curso, key, value)
    return await crud.actualizar(db, curso)

async def eliminar_curso(db: AsyncSession, id_curso: int, id_contexto: int):
    curso = await obtener_curso(db, id_curso, id_contexto)
    # Bloquear borrado si ya hay notas asociadas al curso
    notas_existentes = await db.execute(
        select(Nota.id_nota)
        .join(Insumo, Insumo.id_insumo == Nota.id_insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .where(CursoMateriaDocente.id_curso == id_curso)
        .limit(1)
    )
    if notas_existentes.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el curso porque existen notas asociadas a sus insumos"
        )

    # Bloquear borrado si ya hay insumos creados para el curso
    insumos_existentes = await db.execute(
        select(Insumo.id_insumo)
        .join(CursoMateriaDocente, CursoMateriaDocente.id_cmd == Insumo.id_cmd)
        .where(CursoMateriaDocente.id_curso == id_curso)
        .limit(1)
    )
    if insumos_existentes.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el curso porque existen insumos asociados"
        )

    return await crud.eliminar(db, curso)
