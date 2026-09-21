from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.context_manager import resolve_contexto_id
from app.core.database import get_session
from app.models.anios_lectivos import AnioLectivo
from app.models.usuarios import Usuario
from app.schemas.anios_lectivos import AnioLectivoCreate, AnioLectivoResponse, AnioLectivoUpdate
from app.crud import anios_lectivos as crud
from app.services.authorization_mode import validar_gestion_por_modo

router = APIRouter(prefix="/anios-lectivos", tags=["Años lectivos"])


def _validar_gestion(current_user: Usuario, request: Request):
    validar_gestion_por_modo(current_user, request, "años lectivos")


def _validar_formato(anio_lectivo: str):
    if not anio_lectivo or len(anio_lectivo) != 9 or "-" not in anio_lectivo:
        raise HTTPException(status_code=400, detail="Formato inválido. Usa: 2026-2027")
    inicio, fin = anio_lectivo.split("-", 1)
    if not (inicio.isdigit() and fin.isdigit() and int(fin) == int(inicio) + 1):
        raise HTTPException(status_code=400, detail="El año final debe ser +1 del inicial (ej: 2026-2027)")


def _normalizar_anio_lectivo(anio_lectivo: str) -> str:
    return anio_lectivo.strip()


@router.get("/", response_model=list[AnioLectivoResponse])
async def listar_anios_lectivos(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    id_contexto = await resolve_contexto_id(db, current_user, request)
    return await crud.listar(db, id_contexto)


@router.post("/", response_model=AnioLectivoResponse, status_code=status.HTTP_201_CREATED)
async def crear_anio_lectivo(
    data: AnioLectivoCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # El año activo se cambia en la misma transacción: primero se desactiva el
    # anterior y luego se crea el nuevo para conservar un único activo.
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    anio_lectivo = _normalizar_anio_lectivo(data.anio_lectivo)
    _validar_formato(anio_lectivo)
    existente = await crud.obtener_por_anio(db, anio_lectivo, id_contexto)
    if existente:
        raise HTTPException(status_code=400, detail="Ese año lectivo ya existe")
    anio = AnioLectivo(
        id_contexto=id_contexto,
        anio_lectivo=anio_lectivo,
        activo=data.activo if data.activo is not None else True,
    )
    if anio.activo:
        await db.execute(
            update(AnioLectivo)
            .where(
                AnioLectivo.id_contexto == id_contexto,
                AnioLectivo.activo.is_(True),
            )
            .values(activo=False)
        )
    return await crud.crear(db, anio)


@router.put("/{id_anio_lectivo}", response_model=AnioLectivoResponse)
async def actualizar_anio_lectivo(
    id_anio_lectivo: int,
    data: AnioLectivoUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    anio = await crud.obtener_por_id(db, id_anio_lectivo, id_contexto)
    if not anio:
        raise HTTPException(status_code=404, detail="Año lectivo no encontrado")
    if data.anio_lectivo is not None:
        _validar_formato(data.anio_lectivo)
        anio.anio_lectivo = data.anio_lectivo
    if data.activo is not None:
        anio.activo = data.activo
        if data.activo:
            await db.execute(
                update(AnioLectivo)
                .where(
                    AnioLectivo.id_contexto == id_contexto,
                    AnioLectivo.id_anio_lectivo != id_anio_lectivo,
                    AnioLectivo.activo.is_(True),
                )
                .values(activo=False)
            )
    return await crud.actualizar(db, anio)


@router.put("/anio/{anio_lectivo}", response_model=AnioLectivoResponse)
async def actualizar_anio_lectivo_por_anio(
    anio_lectivo: str,
    data: AnioLectivoUpdate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    anio = await crud.obtener_por_anio(db, _normalizar_anio_lectivo(anio_lectivo), id_contexto)
    if not anio:
        raise HTTPException(status_code=404, detail="Año lectivo no encontrado")
    if data.anio_lectivo is not None:
        _validar_formato(data.anio_lectivo)
        anio.anio_lectivo = data.anio_lectivo
    if data.activo is not None:
        anio.activo = data.activo
        if data.activo:
            await db.execute(
                update(AnioLectivo)
                .where(
                    AnioLectivo.id_contexto == id_contexto,
                    AnioLectivo.id_anio_lectivo != anio.id_anio_lectivo,
                    AnioLectivo.activo.is_(True),
                )
                .values(activo=False)
            )
    return await crud.actualizar(db, anio)


@router.delete("/{id_anio_lectivo}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_anio_lectivo(
    id_anio_lectivo: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    _validar_gestion(current_user, request)
    id_contexto = await resolve_contexto_id(db, current_user, request)
    anio = await crud.obtener_por_id(db, id_anio_lectivo, id_contexto)
    if not anio:
        raise HTTPException(status_code=404, detail="Año lectivo no encontrado")
    await crud.eliminar(db, anio)
