from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.usuarios import (
    RolUsuarioEnum,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResponse
)

from app.services import usuarios as service

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.post("/", response_model=UsuarioResponse)
async def crear_usuario(
    data: UsuarioCreate,
    db: AsyncSession = Depends(get_session)
):
    return await service.crear_usuario(db, data)

@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios(
    rol: RolUsuarioEnum | None = Query(None),
    nombre: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, le=100),
    db: AsyncSession = Depends(get_session)
):
    return await service.listar_usuarios(
        db=db,
        rol=rol,
        nombre=nombre,
        page=page,
        size=size
    )

@router.get("/{id_usuario}", response_model=UsuarioResponse)
async def obtener_usuario(
    id_usuario: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.obtener_usuario(db, id_usuario)

@router.put("/{id_usuario}", response_model=UsuarioResponse)
async def actualizar_usuario(
    id_usuario: int,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_session)
):
    return await service.actualizar_usuario(db, id_usuario, data)

@router.delete("/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_usuario(
    id_usuario: int,
    db: AsyncSession = Depends(get_session)
):
    return await service.eliminar_usuario(db, id_usuario)