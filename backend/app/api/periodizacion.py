from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.core.database import get_session
from app.models.configuracion_periodizacion import ConfiguracionPeriodizacion
from app.models.contextos import Contexto
from app.models.enums import RolUsuarioEnum
from app.models.insumos import Insumo
from app.models.periodos_academicos import PeriodoAcademico
from app.models.usuarios import Usuario
from app.schemas.periodizacion import (
    ConfiguracionCompletaCreate,
    ConfiguracionPeriodizacionResponse,
    PeriodoAcademicoResponse,
)

router = APIRouter(prefix="/periodizacion", tags=["periodizacion"])


TIPOS = {
    "quimestral": (2, "Quimestre"),
    "trimestral": (3, "Trimestre"),
    "bimestral": (4, "Bimestre"),
}


async def _validar_contexto(
    request: Request,
    db: AsyncSession,
    current_user: Usuario,
    solo_lectura: bool = False,
) -> int:
    id_contexto = await resolve_contexto_id(db, current_user, request)
    contexto_result = await db.execute(
        select(Contexto).where(Contexto.id_contexto == id_contexto)
    )
    contexto = contexto_result.scalar_one_or_none()
    if not contexto:
        raise HTTPException(status_code=404, detail="Contexto no encontrado")

    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(status_code=403, detail="Solo docentes en modo personal")
        if contexto.id_owner_docente != current_user.id_usuario:
            raise HTTPException(status_code=403, detail="No puedes configurar otro contexto")
    else:
        if solo_lectura:
            if current_user.rol not in (RolUsuarioEnum.administrativo, RolUsuarioEnum.docente):
                raise HTTPException(status_code=403, detail="Acceso denegado")
        elif current_user.rol != RolUsuarioEnum.administrativo:
            raise HTTPException(status_code=403, detail="Solo administrativos")

    return id_contexto


def _validar_payload(data: ConfiguracionCompletaCreate):
    if data.tipo_periodizacion not in TIPOS:
        raise HTTPException(status_code=400, detail="Tipo de periodizacion no valido")

    cantidad_esperada, singular = TIPOS[data.tipo_periodizacion]
    if data.cantidad_periodos != cantidad_esperada:
        raise HTTPException(
            status_code=400,
            detail=f"{data.tipo_periodizacion} requiere {cantidad_esperada} periodos",
        )

    if len(data.periodos) != data.cantidad_periodos:
        raise HTTPException(status_code=400, detail="Cantidad de periodos incompleta")

    numeros = set()
    periodos_ordenados = sorted(data.periodos, key=lambda item: item.numero_periodo)
    for periodo in periodos_ordenados:
        if periodo.numero_periodo in numeros:
            raise HTTPException(status_code=400, detail="Hay numeros de periodo duplicados")
        numeros.add(periodo.numero_periodo)
        if periodo.fecha_inicio >= periodo.fecha_fin:
            raise HTTPException(
                status_code=400,
                detail=f"Periodo {periodo.numero_periodo} tiene fechas invalidas",
            )

    for indice in range(1, len(periodos_ordenados)):
        previo = periodos_ordenados[indice - 1]
        actual = periodos_ordenados[indice]
        if previo.fecha_fin >= actual.fecha_inicio:
            raise HTTPException(status_code=400, detail="Hay periodos solapados o invertidos")

    return singular


async def _serializar_config(config: ConfiguracionPeriodizacion) -> ConfiguracionPeriodizacionResponse:
    periodos = [PeriodoAcademicoResponse.model_validate(item) for item in config.periodos]
    return ConfiguracionPeriodizacionResponse(
        id_config_periodizacion=config.id_config_periodizacion,
        id_contexto=config.id_contexto,
        anio_lectivo=config.anio_lectivo,
        tipo_periodizacion=config.tipo_periodizacion,
        cantidad_periodos=config.cantidad_periodos,
        nombre_periodo_singular=config.nombre_periodo_singular,
        activo=config.activo,
        completa=len(periodos) == config.cantidad_periodos,
        periodos=periodos,
    )


@router.get("/contexto/{id_contexto}/{anio_lectivo}", response_model=ConfiguracionPeriodizacionResponse)
async def obtener_periodizacion_contexto(
    id_contexto: int,
    anio_lectivo: str,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(ConfiguracionPeriodizacion)
        .where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == anio_lectivo,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="No existe configuracion para este contexto y ano")

    await db.refresh(config, attribute_names=["periodos"])
    return await _serializar_config(config)


@router.get("/actual/{anio_lectivo}", response_model=ConfiguracionPeriodizacionResponse)
async def obtener_periodizacion_actual(
    anio_lectivo: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    id_contexto = await _validar_contexto(request, db, current_user, solo_lectura=True)
    result = await db.execute(
        select(ConfiguracionPeriodizacion)
        .where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == anio_lectivo,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="No existe configuracion para este ano")

    await db.refresh(config, attribute_names=["periodos"])
    return await _serializar_config(config)


@router.post("/configuracion-completa", response_model=ConfiguracionPeriodizacionResponse, status_code=status.HTTP_201_CREATED)
async def crear_o_reemplazar_periodizacion(
    data: ConfiguracionCompletaCreate,
    request: Request,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    id_contexto = await _validar_contexto(request, db, current_user)
    singular = _validar_payload(data)

    result = await db.execute(
        select(ConfiguracionPeriodizacion)
        .where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == data.anio_lectivo,
        )
    )
    config = result.scalar_one_or_none()

    if not config:
        config = ConfiguracionPeriodizacion(
            id_contexto=id_contexto,
            anio_lectivo=data.anio_lectivo,
            tipo_periodizacion=data.tipo_periodizacion,
            cantidad_periodos=data.cantidad_periodos,
            nombre_periodo_singular=data.nombre_periodo_singular or singular,
            activo=True,
        )
        db.add(config)
        await db.flush()
    else:
        config.tipo_periodizacion = data.tipo_periodizacion
        config.cantidad_periodos = data.cantidad_periodos
        config.nombre_periodo_singular = data.nombre_periodo_singular or singular
        await db.execute(
            PeriodoAcademico.__table__.delete().where(
                PeriodoAcademico.id_config_periodizacion == config.id_config_periodizacion
            )
        )

    for periodo in data.periodos:
        db.add(
            PeriodoAcademico(
                id_config_periodizacion=config.id_config_periodizacion,
                numero_periodo=periodo.numero_periodo,
                nombre_periodo=periodo.nombre_periodo or f"{config.nombre_periodo_singular or singular} {periodo.numero_periodo}",
                fecha_inicio=periodo.fecha_inicio,
                fecha_fin=periodo.fecha_fin,
            )
        )

    await db.commit()
    await db.refresh(config)
    await db.refresh(config, attribute_names=["periodos"])
    return await _serializar_config(config)


@router.delete("/actual/{anio_lectivo}", status_code=status.HTTP_200_OK)
async def eliminar_periodizacion_actual(
    anio_lectivo: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    id_contexto = await _validar_contexto(request, db, current_user)
    result = await db.execute(
        select(ConfiguracionPeriodizacion).where(
            ConfiguracionPeriodizacion.id_contexto == id_contexto,
            ConfiguracionPeriodizacion.anio_lectivo == anio_lectivo,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="No existe configuracion para este ano")

    insumos_result = await db.execute(
        select(func.count(Insumo.id_insumo))
        .join(PeriodoAcademico, PeriodoAcademico.id_periodo == Insumo.id_periodo)
        .where(PeriodoAcademico.id_config_periodizacion == config.id_config_periodizacion)
    )
    total_insumos = insumos_result.scalar_one() or 0
    if total_insumos > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la periodizacion porque tiene insumos asociados",
        )

    await db.delete(config)
    await db.commit()
    return {"detail": "Periodizacion eliminada correctamente"}
