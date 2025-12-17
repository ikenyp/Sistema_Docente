from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.usuarios import obtener_por_correo
from app.core.security import verificar_contrasena
from app.auth.jwt import crear_access_token

async def autenticar_usuario(
    db: AsyncSession,
    correo: str,
    contrasena: str
):
    usuario = await obtener_por_correo(db, correo)

    if not usuario or not verificar_contrasena(contrasena, usuario.contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    token = crear_access_token(
        data={
            "sub": str(usuario.id_usuario),
            "rol": usuario.rol
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
