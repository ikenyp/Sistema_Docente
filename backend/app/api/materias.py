from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.schemas.materias import (
    MateriaCreate,
    MateriaUpdate,
    MateriaResponse,
    MateriaCatalogoResponse,
)
from app.services import materias as service
from app.auth.dependencies import get_current_user
from app.schemas.usuarios import RolUsuarioEnum
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Materias"]
)


def _validar_gestion_materias(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar materias"
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar materias"
        )


@router.post("/", response_model=MateriaResponse)
async def crear_materia(
    data: MateriaCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_materias(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_materia(db, data, id_contexto)


@router.get("/", response_model=list[MateriaResponse])
async def listar_materias(
    nombre: str | None = Query(None, description="Búsqueda parcial por nombre"),
    codigo: str | None = Query(None, description="Búsqueda parcial por código"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_materias(
        db=db,
        id_contexto=id_contexto,
        nombre=nombre,
        codigo=codigo,
        page=page,
        size=size
    )


@router.get("/catalogo", response_model=list[MateriaCatalogoResponse])
async def listar_catalogo_materias(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_catalogo_materias(db, id_contexto)


@router.get("/{id_materia}", response_model=MateriaResponse)
async def obtener_materia(
    id_materia: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_materia(db, id_materia, id_contexto)


@router.put("/{id_materia}", response_model=MateriaResponse)
async def actualizar_materia(
    id_materia: int,
    data: MateriaUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_materias(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.actualizar_materia(db, id_materia, data, id_contexto)


@router.delete("/{id_materia}", status_code=200)
async def eliminar_materia(
    id_materia: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    _validar_gestion_materias(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.eliminar_materia(db, id_materia, id_contexto)

