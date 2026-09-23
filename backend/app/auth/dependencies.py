from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import verificar_token
from app.core.database import get_session
from app.crud.usuarios import obtener_por_id
from app.schemas.usuarios import RolUsuarioEnum
from app.core.context_manager import resolve_contexto_id
from app.models.contextos import Contexto
from app.models.usuarios_contextos import UsuarioContexto
from app.core.config import settings
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session)
):
    payload = verificar_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    usuario_id = int(payload.get("sub"))
    usuario = await obtener_por_id(db, usuario_id)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no existe"
        )
    
    #Mapeo del rol a Enum
    try:
        usuario.rol = RolUsuarioEnum(usuario.rol)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol de usuario inválido"
        )

    # El rol efectivo depende del contexto activo. El rol global se conserva
    # como compatibilidad, pero las rutas usan esta membresía cuando existe.
    operadores = {
        correo.strip().lower()
        for correo in settings.PLATFORM_OPERATOR_EMAILS.split(",")
        if correo.strip()
    }
    try:
        id_contexto = await resolve_contexto_id(db, usuario, request)
        contexto_result = await db.execute(
            select(Contexto).where(Contexto.id_contexto == id_contexto),
        )
        contexto = contexto_result.scalar_one_or_none()
        if contexto and contexto.tipo_modo == "personal":
            usuario.rol = RolUsuarioEnum.docente
        else:
            membresia_result = await db.execute(
                select(UsuarioContexto.rol).where(
                    UsuarioContexto.id_usuario == usuario.id_usuario,
                    UsuarioContexto.id_contexto == id_contexto,
                    UsuarioContexto.activo == True,
                ),
            )
            rol_contexto = membresia_result.scalar_one_or_none()
            if rol_contexto:
                usuario.rol = RolUsuarioEnum(rol_contexto)
    except HTTPException:
        if usuario.correo.lower() in operadores:
            return usuario
        raise

    return usuario


def require_role(*roles: RolUsuarioEnum):
    async def checker(usuario = Depends(get_current_user)):
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos"
            )
        return usuario
    return checker


def require_context_role(*roles: RolUsuarioEnum):
    """Authorizes using the role granted in the active context."""
    async def checker(
        request: Request,
        db: AsyncSession = Depends(get_session),
        usuario=Depends(get_current_user),
    ):
        id_contexto = await resolve_contexto_id(db, usuario, request)
        contexto_result = await db.execute(
            select(Contexto).where(Contexto.id_contexto == id_contexto),
        )
        contexto = contexto_result.scalar_one_or_none()
        rol_contexto = None
        if contexto and contexto.tipo_modo == "personal":
            rol_contexto = RolUsuarioEnum.docente.value
        else:
            membresia_result = await db.execute(
                select(UsuarioContexto.rol).where(
                    UsuarioContexto.id_usuario == usuario.id_usuario,
                    UsuarioContexto.id_contexto == id_contexto,
                    UsuarioContexto.activo == True,
                ),
            )
            rol_contexto = membresia_result.scalar_one_or_none()

        roles_permitidos = {rol.value for rol in roles}
        if rol_contexto not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes el rol requerido en este contexto",
            )
        return usuario

    return checker


async def require_platform_operator(usuario=Depends(get_current_user)):
    operadores = {
        correo.strip().lower()
        for correo in settings.PLATFORM_OPERATOR_EMAILS.split(",")
        if correo.strip()
    }
    if usuario.correo.lower() not in operadores:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de operador de plataforma",
        )
    return usuario
