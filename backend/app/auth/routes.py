from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.dependencies import get_current_user, require_role
from app.core.app_mode import resolve_app_mode
from app.core.database import get_session
from app.services.auth import (
    autenticar_usuario,
    confirmar_recuperacion_contrasena,
    registrar_docente_personal,
    solicitar_recuperacion_contrasena,
)
from app.schemas.auth import (
    ConfirmacionRecuperacionContrasena,
    RegistroDocentePersonal,
    SolicitudRecuperacionContrasena,
)
from app.schemas.usuarios import RolUsuarioEnum, UsuarioResponse
from app.crud import usuarios as crud

router = APIRouter()

#Ruta de login que emite un token JWT
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)
):
    # Autenticar_usuario debe lanzar HTTPException si falla
    token = await autenticar_usuario(db, correo=form_data.username, contrasena=form_data.password)
    user = await crud.obtener_por_correo(db, form_data.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciales inválidas")

    return {
        "access_token": token["access_token"],
        "token_type": token.get("token_type", "bearer"),
        "role": user.rol.value if hasattr(user.rol, "value") else user.rol
    }


@router.post("/register-personal", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register_personal(
    data: RegistroDocentePersonal,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    app_mode = resolve_app_mode(request)
    return await registrar_docente_personal(db, data, app_mode)


@router.post("/password-reset/request")
async def password_reset_request(
    data: SolicitudRecuperacionContrasena,
    db: AsyncSession = Depends(get_session)
):
    return await solicitar_recuperacion_contrasena(db, data)


@router.post("/password-reset/confirm", response_model=UsuarioResponse)
async def password_reset_confirm(
    data: ConfirmacionRecuperacionContrasena,
    db: AsyncSession = Depends(get_session)
):
    return await confirmar_recuperacion_contrasena(db, data)

# Ruta protegida que devuelve el usuario actual
@router.get("/me", response_model=UsuarioResponse)
async def leer_usuario_actual(
    usuario = Depends(get_current_user)
):
    return usuario

# Ruta protegida que solo permite acceso a usuarios con rol ADMINISTRATIVO
@router.get("/admin-only")
async def admin_route(
    usuario = Depends(require_role(RolUsuarioEnum.administrativo))
):
    if usuario.rol != RolUsuarioEnum.administrativo:
        return {"message": "Acceso denegado"}
    return {"message": "Bienvenido, administrador"}

# Ruta protegida que permite acceso a usuarios con rol DOCENTE o ADMINISTRATIVO
@router.get("/docente-admins")
async def multiple_role_route(
    usuario = Depends(require_role(RolUsuarioEnum.docente, RolUsuarioEnum.administrativo))
):
    return {"message": f"Bienvenido, {usuario.rol.value}"}