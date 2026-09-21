from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.app_mode import resolve_app_mode
from app.models.contextos import Contexto
from app.models.usuarios import Usuario
from app.schemas.usuarios import RolUsuarioEnum


async def resolve_contexto_id(
    db: AsyncSession,
    current_user: Usuario,
    request=None,
) -> int:
    # El header selecciona el contexto, pero no puede saltarse las reglas del rol
    # ni permitir que un usuario acceda al espacio personal de otra persona.
    modo = resolve_app_mode(request)

    if modo == "personal" and current_user.rol == RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El modo personal solo está disponible para docentes",
        )

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

    if current_user.rol == RolUsuarioEnum.docente:
        contexto_personal_result = await db.execute(
            select(Contexto.id_contexto).where(
                Contexto.tipo_modo == "personal",
                Contexto.id_owner_docente == current_user.id_usuario,
                Contexto.activo == True,
            )
        )
        if contexto_personal_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta fue creada en modo personal. Selecciona el modo personal para ingresar.",
            )

    result = await db.execute(
        select(Contexto).where(
            Contexto.tipo_modo == "institucional",
            Contexto.id_owner_docente.is_(None),
            Contexto.activo == True,
        ).order_by(Contexto.id_contexto)
    )
    contexto = result.scalars().first()

    if contexto is None:
        contexto = Contexto(
            tipo_modo="institucional",
            nombre="Institucional General",
            id_owner_docente=None,
            activo=True,
        )
        db.add(contexto)
        await db.commit()
        await db.refresh(contexto)

    return contexto.id_contexto
