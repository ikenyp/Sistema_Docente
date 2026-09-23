from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.app_mode import resolve_app_mode
from app.models.contextos import Contexto
from app.models.usuarios_contextos import UsuarioContexto
from app.models.usuarios import Usuario
from app.core.config import settings


async def resolve_contexto_id(
    db: AsyncSession,
    current_user: Usuario,
    request=None,
) -> int:
    # El header selecciona el contexto, pero no puede saltarse las reglas del rol
    # ni permitir que un usuario acceda al espacio personal de otra persona.
    modo = resolve_app_mode(request)

    operadores = {
        correo.strip().lower()
        for correo in settings.PLATFORM_OPERATOR_EMAILS.split(",")
        if correo.strip()
    }
    if modo == "plataforma" and current_user.correo.lower() in operadores:
        result = await db.execute(
            select(Contexto.id_contexto).where(
                Contexto.tipo_modo == "institucional",
                Contexto.activo == True,
            ).order_by(Contexto.id_contexto)
        )
        contexto_plataforma = result.scalar_one_or_none()
        if contexto_plataforma is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existe una institución activa para inicializar la plataforma",
            )
        return contexto_plataforma

    if modo == "personal":
        result = await db.execute(
            select(Contexto).where(
                Contexto.tipo_modo == "personal",
                Contexto.id_owner_docente == current_user.id_usuario,
                Contexto.activo == True,
            ).order_by(Contexto.id_contexto)
        )
        # Puede haber contextos duplicados creados por versiones anteriores o
        # por solicitudes concurrentes. Seleccionamos uno estable sin romper
        # todas las rutas del usuario con MultipleResultsFound.
        contexto = result.scalars().first()

        if contexto is None:
            contexto = Contexto(
                tipo_modo="personal",
                nombre=f"Personal Docente {current_user.id_usuario}",
                id_owner_docente=current_user.id_usuario,
                activo=True,
            )
            db.add(contexto)
            await db.commit()
            await db.refresh(contexto)

        return contexto.id_contexto

    requested_contexto = None
    if request is not None:
        raw_contexto = (request.headers.get("x-contexto-id") or "").strip()
        if raw_contexto:
            try:
                requested_contexto = int(raw_contexto)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El contexto seleccionado no es válido",
                ) from exc

    membership_query = (
        select(Contexto)
        .join(UsuarioContexto, UsuarioContexto.id_contexto == Contexto.id_contexto)
        .where(
            UsuarioContexto.id_usuario == current_user.id_usuario,
            UsuarioContexto.activo == True,
            Contexto.tipo_modo == "institucional",
            Contexto.activo == True,
        )
        .order_by(Contexto.id_contexto)
    )
    if requested_contexto is not None:
        membership_query = membership_query.where(Contexto.id_contexto == requested_contexto)

    result = await db.execute(membership_query)
    contexto = result.scalars().first()
    if contexto is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso al contexto institucional seleccionado",
        )

    return contexto.id_contexto
