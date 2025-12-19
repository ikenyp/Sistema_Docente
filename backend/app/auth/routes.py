from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_session
from app.services.auth import autenticar_usuario
from app.schemas.usuarios import RolUsuario

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

#Ruta de login que emite un token JWT
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)
):
    return await autenticar_usuario(
        db,
        correo=form_data.username,
        contrasena=form_data.password
    )

# Ruta protegida que devuelve el usuario actual
@router.get("/me")
async def leer_usuario_actual(
    usuario = Depends(get_current_user)
):
    return usuario

# Ruta protegida que solo permite acceso a usuarios con rol ADMINISTRATIVO
@router.get("/admin-only")
async def admin_route(
    usuario = Depends(require_role(RolUsuario.ADMINISTRATIVO))
):
    if usuario.rol != RolUsuario.ADMINISTRATIVO:
        return {"message": "Acceso denegado"}
    return {"message": "Bienvenido, administrador"}

# Ruta protegida que permite acceso a usuarios con rol DOCENTE o ADMINISTRATIVO
@router.get("/docente-admins")
async def multiple_role_route(
    usuario = Depends(require_role(RolUsuario.DOCENTE, RolUsuario.ADMINISTRATIVO))
):
    return {"message": f"Bienvenido, {usuario.rol.value}"}