from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.notas import (NotaCreate, NotaUpdate,NotaResponse)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import notas as service
from app.auth.dependencies import get_current_user, require_role
from app.models.usuarios import Usuario

router = APIRouter(
    tags=["Notas"]
)


@router.post("/", response_model=NotaResponse)
async def crear_nota(
    data: NotaCreate,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_nota(db, data)


@router.get("/", response_model=list[NotaResponse])
async def listar_notas(
    id_estudiante: int | None = Query(None),
    id_insumo: int | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_notas(
        db=db,
        id_estudiante=id_estudiante,
        id_insumo=id_insumo,
        page=page,
        size=size
    )


@router.get("/{id_nota}", response_model=NotaResponse)
async def obtener_nota(
    id_nota: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_nota(db, id_nota)


@router.put("/{id_nota}", response_model=NotaResponse)
async def actualizar_nota(
    id_nota: int,
    data: NotaUpdate,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden modificar notas"
        )
    return await service.actualizar_nota(db, id_nota, data)


@router.delete("/{id_nota}", status_code=200)
async def eliminar_nota(
    id_nota: int,
    current_user: Usuario = Depends(require_role(RolUsuarioEnum.docente)),
    db: AsyncSession = Depends(get_session)
):
    # Validar que no sea admin
    if current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden eliminar notas"
        )
    return await service.eliminar_nota(db, id_nota)
