from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.app_mode import is_personal_mode
from app.core.context_manager import resolve_contexto_id
from app.core.database import get_session
from app.models.usuarios import Usuario
from app.schemas.estructuras_academicas import (
    EstructuraAcademicaCreate,
    EstructuraAcademicaResponse,
    EstructuraAcademicaUpdate,
    EstructuraMateriaCreate,
    EstructuraMateriaResponse,
)
from app.schemas.usuarios import RolUsuarioEnum
from app.services import estructuras_academicas as service

router = APIRouter(prefix="/estructuras-academicas", tags=["Estructura académica"])


def _validar_gestion(current_user: Usuario, request: Request):
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="En modo personal solo docentes pueden gestionar la estructura académica",
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administrativos pueden gestionar la estructura académica",
        )


@router.post("/", response_model=EstructuraAcademicaResponse)
async def crear_estructura_academica(
    data: EstructuraAcademicaCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.crear_estructura_academica(db, data, id_contexto)


@router.get("/", response_model=list[EstructuraAcademicaResponse])
async def listar_estructuras_academicas(
    nombre: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    request: Request = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_estructuras_academicas(db, id_contexto, nombre, page, size)


@router.get("/{id_estructura_academica}", response_model=EstructuraAcademicaResponse)
async def obtener_estructura_academica(
    id_estructura_academica: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.obtener_estructura_academica(db, id_estructura_academica, id_contexto)


@router.put("/{id_estructura_academica}", response_model=EstructuraAcademicaResponse)
async def actualizar_estructura_academica(
    id_estructura_academica: int,
    data: EstructuraAcademicaUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.actualizar_estructura_academica(
        db,
        id_estructura_academica,
        data,
        id_contexto,
    )


@router.get("/{id_estructura_academica}/materias", response_model=list[EstructuraMateriaResponse])
async def listar_materias_de_estructura(
    id_estructura_academica: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.listar_materias_de_estructura(db, id_estructura_academica, id_contexto)


@router.post("/{id_estructura_academica}/materias", response_model=EstructuraMateriaResponse)
async def agregar_materia_a_estructura(
    id_estructura_academica: int,
    data: EstructuraMateriaCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.agregar_materia_a_estructura(
        db,
        id_estructura_academica,
        data,
        id_contexto,
    )


@router.delete("/{id_estructura_academica}/materias/{id_materia}", status_code=200)
async def eliminar_materia_de_estructura(
    id_estructura_academica: int,
    id_materia: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await service.eliminar_materia_de_estructura(
        db,
        id_estructura_academica,
        id_materia,
        id_contexto,
    )
