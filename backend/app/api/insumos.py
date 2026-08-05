from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
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
from app.auth.dependencies import get_current_user
from app.schemas.usuarios import RolUsuarioEnum
from app.models.usuarios import Usuario
from app.services.authorization import (
    validar_usuario_puede_editar_cmd,
    validar_usuario_puede_editar_insumo,
    validar_usuario_puede_ver_cmd,
    validar_usuario_puede_ver_insumo,
)

router = APIRouter(
    tags=["Insumos"]
)


@router.post("/", response_model=InsumoResponse)
async def crear_insumo(
    data: InsumoCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para crear insumos")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_cmd(db, data.id_cmd, current_user, id_contexto)
    return await service.crear_insumo(db, data, current_user, id_contexto)


@router.get("/", response_model=list[InsumoResponse])
async def listar_insumos(
    id_cmd: int | None = Query(None),
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    periodo: int | None = Query(None, ge=1, description="Filtrar por periodo academico"),
    tipo_insumo: TipoInsumoEnum | None = Query(None, description="Filtrar por tipo de insumo"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        if id_cmd is None:
            raise HTTPException(status_code=400, detail="Debes filtrar por asignación para listar insumos")
        await validar_usuario_puede_ver_cmd(db, id_cmd, current_user, id_contexto)
    return await service.listar_insumos(
        db=db,
        id_contexto=id_contexto,
        id_cmd=id_cmd,
        nombre=nombre,
        periodo=periodo,
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
    await validar_usuario_puede_ver_insumo(db, id_insumo, current_user, id_contexto)
    return await service.obtener_insumo(db, id_insumo, id_contexto)


@router.put("/{id_insumo}", response_model=InsumoResponse)
async def actualizar_insumo(
    id_insumo: int,
    data: InsumoUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para actualizar insumos")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_insumo(db, id_insumo, current_user, id_contexto)
    return await service.actualizar_insumo(db, id_insumo, data, current_user, id_contexto)


@router.delete("/{id_insumo}", status_code=200)
async def eliminar_insumo(
    id_insumo: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.rol not in [RolUsuarioEnum.docente, RolUsuarioEnum.administrativo]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para eliminar insumos")
    id_contexto = await resolve_contexto_id(db, current_user, request)
    if current_user.rol != RolUsuarioEnum.administrativo:
        await validar_usuario_puede_editar_insumo(db, id_insumo, current_user, id_contexto)
    return await service.eliminar_insumo(db, id_insumo, current_user, id_contexto)
