from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import verificar_token
from app.core.database import get_session
from app.crud.usuarios import obtener_por_id
from app.schemas.usuarios import RolUsuarioEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
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
