from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_platform_operator
from app.core.database import get_session
from app.models.contextos import Contexto
from app.models.instituciones import Institucion
from app.models.usuarios import Usuario
from app.schemas.instituciones import InstitucionCreate, InstitucionResponse
from app.services.instituciones import crear_institucion_con_administrador


router = APIRouter(prefix="/plataforma/instituciones", tags=["Plataforma"])


@router.get("", response_model=list[InstitucionResponse])
async def listar_instituciones(
    _: object = Depends(require_platform_operator),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Institucion, Contexto, Usuario.correo)
        .join(Contexto, Contexto.id_institucion == Institucion.id_institucion)
        .outerjoin(Usuario, Usuario.id_usuario == Contexto.id_owner_docente)
        .order_by(Institucion.nombre)
    )
    return [
        InstitucionResponse(
            id_institucion=institucion.id_institucion,
            nombre=institucion.nombre,
            slug=institucion.slug,
            activo=institucion.activo,
            id_contexto=contexto.id_contexto,
            correo_administrador=correo,
        )
        for institucion, contexto, correo in result.all()
    ]


@router.post("", response_model=InstitucionResponse, status_code=status.HTTP_201_CREATED)
async def crear_institucion(
    data: InstitucionCreate,
    _: object = Depends(require_platform_operator),
    db: AsyncSession = Depends(get_session),
):
    institucion, administrador, _ = await crear_institucion_con_administrador(
        db,
        nombre_institucion=data.nombre,
        correo_administrador=data.correo_administrador,
        nombre_administrador=data.nombre_administrador,
        apellido_administrador=data.apellido_administrador,
        contrasena_temporal=data.contrasena_temporal,
    )
    contexto = await db.scalar(
        select(Contexto).where(Contexto.id_institucion == institucion.id_institucion)
    )
    return InstitucionResponse(
        id_institucion=institucion.id_institucion,
        nombre=institucion.nombre,
        slug=institucion.slug,
        activo=institucion.activo,
        id_contexto=contexto.id_contexto,
        correo_administrador=administrador.correo,
    )


@router.patch("/{id_institucion}/estado", response_model=InstitucionResponse)
async def cambiar_estado_institucion(
    id_institucion: int,
    activo: bool,
    _: object = Depends(require_platform_operator),
    db: AsyncSession = Depends(get_session),
):
    institucion = await db.get(Institucion, id_institucion)
    if not institucion:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    institucion.activo = activo
    await db.commit()
    contexto = await db.scalar(select(Contexto).where(Contexto.id_institucion == id_institucion))
    return InstitucionResponse(
        id_institucion=institucion.id_institucion,
        nombre=institucion.nombre,
        slug=institucion.slug,
        activo=institucion.activo,
        id_contexto=contexto.id_contexto,
    )
