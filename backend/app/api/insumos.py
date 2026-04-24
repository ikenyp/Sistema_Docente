from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.context_manager import resolve_contexto_id
from app.models.enums import TipoInsumoEnum
from app.schemas.insumos import (
    InsumoCreate,
    InsumoUpdate,
    InsumoResponse
)
from app.services import insumos as service
from app.auth.dependencies import get_current_user, require_role
from app.schemas.usuarios import RolUsuarioEnum
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Insumos"]
)


@router.post("/", response_model=InsumoResponse)
async def crear_insumo(
    data: InsumoCreate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_insumo(db, data, current_user, id_contexto)


@router.get("/", response_model=list[InsumoResponse])
async def listar_insumos(
    id_cmd: int | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    trimestre: int | None = Query(None, ge=1, le=3, description="Filtrar por trimestre (1, 2 o 3)"),
    tipo_insumo: TipoInsumoEnum | None = Query(None, description="Filtrar por tipo de insumo"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_insumos(
        db=db,
        id_contexto=id_contexto,
        id_cmd=id_cmd,
        nombre=nombre,
        trimestre=trimestre,
        tipo_insumo=tipo_insumo,
        page=page,
        size=size
    )


@router.get("/{id_insumo}", response_model=InsumoResponse)
async def obtener_insumo(
    id_insumo: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_insumo(db, id_insumo, id_contexto)


@router.put("/{id_insumo}", response_model=InsumoResponse)
async def actualizar_insumo(
    id_insumo: int,
    data: InsumoUpdate,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.actualizar_insumo(db, id_insumo, data, current_user, id_contexto)


@router.delete("/{id_insumo}", status_code=200)
async def eliminar_insumo(
    id_insumo: int,
    request: Request,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.eliminar_insumo(db, id_insumo, current_user, id_contexto)
