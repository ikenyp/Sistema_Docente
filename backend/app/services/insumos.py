from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from app.models.insumos import Insumo
from app.models.cursos_materias_docentes import CursoMateriaDocente
from app.models.enums import TipoInsumoEnum
from app.models.notas import Nota
from app.crud import insumos as crud
from app.schemas.insumos import InsumoCreate, InsumoUpdate


# Crear insumo
async def crear_insumo(db: AsyncSession, data: InsumoCreate, current_user = None):
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
    
    # VALIDACIÓN: Docente solo puede crear insumos en sus propias asignaciones
    if current_user and current_user.id_usuario != cmd_obj.id_docente:
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

    # Validar trimestre
    if data.id_trimestre not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El trimestre debe ser 1, 2 o 3"
        )

    # Validar que no exista el insumo en el mismo CMD
    if await crud.obtener_por_cmd_nombre(db, data.id_cmd, data.nombre):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un insumo con ese nombre en esta asignación"
        )

    # Validar que solo haya un proyecto o examen trimestral por trimestre
    if data.tipo_insumo in [TipoInsumoEnum.proyecto_trimestral, TipoInsumoEnum.examen_trimestral]:
        existente = await crud.obtener_por_cmd_trimestre_tipo(
            db, 
            data.id_cmd, 
            data.id_trimestre, 
            data.tipo_insumo
        )
        if existente:
            tipo_texto = "proyecto trimestral" if data.tipo_insumo == TipoInsumoEnum.proyecto_trimestral else "examen trimestral"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un {tipo_texto} para el trimestre {data.id_trimestre} en esta asignación"
            )

    insumo = Insumo(
        id_cmd=data.id_cmd,
        nombre=data.nombre,
        descripcion=data.descripcion,
        ponderacion=data.ponderacion,
        tipo_insumo=data.tipo_insumo,
        id_trimestre=data.id_trimestre,
        fecha_creacion=date.today()
    )

    return await crud.crear(db, insumo)


# Listar insumos
async def listar_insumos(
    db: AsyncSession,
    id_cmd: int | None,
    nombre: str | None,
    trimestre: int | None,
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
        id_cmd=id_cmd,
        nombre=nombre,
        trimestre=trimestre,
        tipo_insumo=tipo_insumo,
        page=page,
        size=size
    )


# Obtener insumo
async def obtener_insumo(db: AsyncSession, id_insumo: int):
    insumo = await crud.obtener_por_id(db, id_insumo)

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
    current_user = None
):
    insumo = await obtener_insumo(db, id_insumo)
    
    # VALIDACIÓN: Docente solo puede actualizar sus propios insumos
    if current_user and current_user.id_usuario != insumo.cmd.id_docente:
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

    # Validar trimestre si se actualiza
    if "id_trimestre" in values:
        if values["id_trimestre"] not in [1, 2, 3]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El trimestre debe ser 1, 2 o 3"
            )

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
            values["nombre"]
        )
        if existente and existente.id_insumo != insumo.id_insumo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un insumo con ese nombre en esta asignación"
            )

    # Validar que no se duplique proyecto/examen si se cambia tipo o trimestre
    tipo_actualizado = values.get("tipo_insumo", insumo.tipo_insumo)
    trimestre_actualizado = values.get("id_trimestre", insumo.trimestre)
    
    if tipo_actualizado in [TipoInsumoEnum.proyecto_trimestral, TipoInsumoEnum.examen_trimestral]:
        # Solo validar si cambió el tipo o el trimestre
        if "tipo_insumo" in values or "id_trimestre" in values:
            existente = await crud.obtener_por_cmd_trimestre_tipo(
                db,
                insumo.id_cmd,
                trimestre_actualizado,
                tipo_actualizado,
                id_insumo_excluir=id_insumo
            )
            if existente:
                tipo_texto = "proyecto trimestral" if tipo_actualizado == TipoInsumoEnum.proyecto_trimestral else "examen trimestral"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe un {tipo_texto} para el trimestre {trimestre_actualizado} en esta asignación"
                )

    for key, value in values.items():
        setattr(insumo, key, value)

    return await crud.actualizar(db, insumo)


# Eliminar insumo (eliminación física)
async def eliminar_insumo(db: AsyncSession, id_insumo: int, current_user = None):
    insumo = await obtener_insumo(db, id_insumo)
    
    # VALIDACIÓN: Docente solo puede eliminar sus propios insumos
    if current_user and current_user.id_usuario != insumo.cmd.id_docente:
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
