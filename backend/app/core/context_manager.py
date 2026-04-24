from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.app_mode import resolve_app_mode
from app.models.contextos import Contexto
from app.models.usuarios import Usuario


async def resolve_contexto_id(
    db: AsyncSession,
    current_user: Usuario,
    request=None,
) -> int:
    modo = resolve_app_mode(request)

    if modo == "personal":
        result = await db.execute(
            select(Contexto).where(
                Contexto.tipo_modo == "personal",
                Contexto.id_owner_docente == current_user.id_usuario,
                Contexto.activo == True,
            )
        )
        contexto = result.scalar_one_or_none()

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

    result = await db.execute(
        select(Contexto).where(
            Contexto.tipo_modo == "institucional",
            Contexto.id_owner_docente.is_(None),
            Contexto.activo == True,
        )
    )
    contexto = result.scalar_one_or_none()

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
