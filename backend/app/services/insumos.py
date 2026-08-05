from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from app.models.insumos import Insumo
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.cursos import Curso
from app.models.configuracion_periodizacion import ConfiguracionPeriodizacion
from app.models.periodos_academicos import PeriodoAcademico
from app.models.enums import TipoInsumoEnum
from app.models.notas import Nota
from app.crud import insumos as crud
from app.schemas.insumos import InsumoCreate, InsumoUpdate
from app.schemas.usuarios import RolUsuarioEnum


async def _resolver_periodo(db: AsyncSession, id_curso: int, id_contexto: int, id_periodo: int):
    curso_result = await db.execute(
        select(Curso).where(Curso.id_curso == id_curso, Curso.id_contexto == id_contexto)
    )
    curso_obj = curso_result.scalar_one_or_none()
    if not curso_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado en el contexto actual",
        )

    config_result = await db.execute(
        select(ConfiguracionPeriodizacion).where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == curso_obj.anio_lectivo,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay configuracion de periodizacion para el contexto y ano lectivo del curso",
        )

    periodo_result = await db.execute(
        select(PeriodoAcademico).where(
            PeriodoAcademico.id_periodo == id_periodo,
            PeriodoAcademico.id_config_periodizacion == config.id_config_periodizacion,
        )
    )
    periodo = periodo_result.scalar_one_or_none()
    if not periodo:
        raise HTTPException(status_code=404, detail="Periodo no encontrado para este contexto y ano")
    return periodo, curso_obj


# Crear insumo
async def crear_insumo(db: AsyncSession, data: InsumoCreate, current_user = None, id_contexto: int | None = None):
    if id_contexto is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contexto no válido"
        )
    # Validar que CMD exista
    cmd_query = select(CursoMateriaDocente).where(CursoMateriaDocente.id_cmd == data.id_cmd)
    if id_contexto is not None:
        cmd_query = cmd_query.join(Curso, Curso.id_curso == CursoMateriaDocente.id_curso).where(Curso.id_contexto == id_contexto)
    cmd = await db.execute(cmd_query)
    cmd_obj = cmd.scalar_one_or_none()
    if not cmd_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La asignación curso-materia-docente no existe"
        )
    
    # VALIDACIÓN: Docente solo puede crear insumos en sus propias asignaciones
    if (
        current_user
        and current_user.rol != RolUsuarioEnum.administrativo
        and current_user.id_usuario != cmd_obj.id_docente
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes crear insumos para tus propias materias"
        )

    # Validar ponderación (1 - 10)
    if not 1 <= data.ponderacion <= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ponderación debe estar entre 1 y 10"
        )

    periodo_obj, _ = await _resolver_periodo(
        db,
        cmd_obj.id_curso,
        id_contexto,
        data.id_periodo,
    )

    # Validar que no exista el insumo en el mismo CMD
    if await crud.obtener_por_cmd_nombre(db, data.id_cmd, data.nombre, id_contexto):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un insumo con ese nombre en esta asignación"
        )

    # Validar que solo haya un proyecto o examen por periodo
    if data.tipo_insumo in [TipoInsumoEnum.proyecto_periodo, TipoInsumoEnum.examen_periodo]:
        existente = await crud.obtener_por_cmd_periodo_tipo(
            db, 
            data.id_cmd, 
            periodo_obj.id_periodo,
            data.tipo_insumo,
            id_contexto=id_contexto,
        )
        if existente:
            tipo_texto = "proyecto del periodo" if data.tipo_insumo == TipoInsumoEnum.proyecto_periodo else "examen del periodo"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un {tipo_texto} para el periodo {periodo_obj.numero_periodo} en esta asignación"
            )

    insumo = Insumo(
        id_cmd=data.id_cmd,
        nombre=data.nombre,
        descripcion=data.descripcion,
        ponderacion=data.ponderacion,
        tipo_insumo=data.tipo_insumo,
        id_periodo=periodo_obj.id_periodo,
        fecha_creacion=date.today()
    )

    return await crud.crear(db, insumo)


# Listar insumos
async def listar_insumos(
    db: AsyncSession,
    id_contexto: int,
    id_cmd: int | None,
    nombre: str | None,
    periodo: int | None,
    tipo_insumo: TipoInsumoEnum | None,
    page: int,
    size: int
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 10

    return await crud.listar_insumos(
        db=db,
        id_contexto=id_contexto,
        id_cmd=id_cmd,
        nombre=nombre,
        periodo=periodo,
        tipo_insumo=tipo_insumo,
        page=page,
        size=size
    )


# Obtener insumo
async def obtener_insumo(db: AsyncSession, id_insumo: int, id_contexto: int | None):
    if id_contexto is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contexto no válido"
        )
    insumo = await crud.obtener_por_id(db, id_insumo, id_contexto)

    if not insumo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo no encontrado"
        )

    return insumo


# Actualizar insumo
async def actualizar_insumo(
    db: AsyncSession,
    id_insumo: int,
    data: InsumoUpdate,
    current_user = None,
    id_contexto: int | None = None,
):
    insumo = await obtener_insumo(db, id_insumo, id_contexto)
    
    # VALIDACIÓN: Docente solo puede actualizar sus propios insumos
    if (
        current_user
        and current_user.rol != RolUsuarioEnum.administrativo
        and current_user.id_usuario != insumo.cmd.id_docente
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el docente asignado puede actualizar este insumo"
        )

    values = data.model_dump(exclude_unset=True)

    # Validar ponderación si se actualiza
    if "ponderacion" in values:
        if not 1 <= values["ponderacion"] <= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La ponderación debe estar entre 1 y 10"
            )

    periodo_actualizado = insumo.id_periodo
    
    # Validar periodo si se actualiza
    if "id_periodo" in values:
        periodo_obj, _ = await _resolver_periodo(
            db,
            insumo.cmd.id_curso,
            id_contexto,
            values["id_periodo"],
        )
        periodo_actualizado = periodo_obj.id_periodo
        values["id_periodo"] = periodo_actualizado

    # VALIDACIÓN CRÍTICA: No permitir cambiar tipo_insumo si ya tiene notas
    if "tipo_insumo" in values:
        notas_existentes = await db.execute(
            select(Nota).where(Nota.id_insumo == id_insumo)
        )
        if notas_existentes.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede cambiar el tipo de insumo si ya tiene notas asignadas"
            )

    # Validar unicidad si cambia el nombre
    if "nombre" in values:
        existente = await crud.obtener_por_cmd_nombre(
            db,
            insumo.id_cmd,
            values["nombre"],
            id_contexto,
        )
        if existente and existente.id_insumo != insumo.id_insumo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un insumo con ese nombre en esta asignación"
            )

    # Validar que no se duplique proyecto/examen si se cambia tipo o periodo
    tipo_actualizado = values.get("tipo_insumo", insumo.tipo_insumo)
    
    if tipo_actualizado in [TipoInsumoEnum.proyecto_periodo, TipoInsumoEnum.examen_periodo]:
        if "tipo_insumo" in values or "id_periodo" in values:
            existente = await crud.obtener_por_cmd_periodo_tipo(
                db,
                insumo.id_cmd,
                periodo_actualizado,
                tipo_actualizado,
                id_insumo_excluir=id_insumo,
                id_contexto=id_contexto,
            )
            if existente:
                tipo_texto = "proyecto del periodo" if tipo_actualizado == TipoInsumoEnum.proyecto_periodo else "examen del periodo"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe un {tipo_texto} para este periodo en esta asignación"
                )

    for key, value in values.items():
        setattr(insumo, key, value)

    return await crud.actualizar(db, insumo)


# Eliminar insumo (eliminación física)
async def eliminar_insumo(db: AsyncSession, id_insumo: int, current_user = None, id_contexto: int | None = None):
    insumo = await obtener_insumo(db, id_insumo, id_contexto)
    
    # VALIDACIÓN: Docente solo puede eliminar sus propios insumos
    if (
        current_user
        and current_user.rol != RolUsuarioEnum.administrativo
        and current_user.id_usuario != insumo.cmd.id_docente
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el docente asignado puede eliminar este insumo"
        )
    
    # VALIDACIÓN CRÍTICA: No permitir eliminar si tiene notas asignadas
    notas_existentes = await db.execute(
        select(Nota).where(Nota.id_insumo == id_insumo)
    )
    if notas_existentes.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar un insumo que tiene notas asignadas"
        )
    
    await crud.eliminar(db, insumo)
    return {"detail": "Insumo eliminado correctamente"}
