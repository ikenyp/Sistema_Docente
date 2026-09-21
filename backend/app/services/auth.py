from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.concurrency import run_in_threadpool
from email.message import EmailMessage
import smtplib

from app.crud.usuarios import obtener_por_correo
from app.core.security import verificar_contrasena, hash_contrasena
from app.core.config import settings
from app.auth.jwt import crear_access_token, crear_token_recuperacion, verificar_token_recuperacion
from app.schemas.auth import (
    RegistroDocentePersonal,
    SolicitudRecuperacionContrasena,
    ConfirmacionRecuperacionContrasena,
)
from app.models.usuarios import Usuario
from app.crud import usuarios as crud
from app.schemas.usuarios import RolUsuarioEnum

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
            "rol": usuario.rol.value
        }
    )

    return {
        "access_token": token, "token_type": "bearer"
    }


async def registrar_docente_personal(
    db: AsyncSession,
    data: RegistroDocentePersonal,
    app_mode: str
):
    if app_mode != "personal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El registro libre solo está disponible en modo personal"
        )

    if await obtener_por_correo(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    usuario = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        correo=data.correo,
        contrasena=hash_contrasena(data.contrasena),
        rol=RolUsuarioEnum.docente.value,
        activo=True,
    )
    return await crud.crear(db, usuario)


async def solicitar_recuperacion_contrasena(
    db: AsyncSession,
    data: SolicitudRecuperacionContrasena,
):
    usuario = await obtener_por_correo(db, data.correo)
    if not usuario:
        return {"mensaje": "Si la cuenta existe, recibirás instrucciones de recuperación."}

    token = crear_token_recuperacion({"sub": str(usuario.id_usuario)})
    if not settings.SMTP_ENABLED or not all((settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, settings.SMTP_FROM)):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="El servicio de recuperación no está disponible")

    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/?view=recover&token={token}"
    mensaje = EmailMessage()
    mensaje["Subject"] = "Recuperación de contraseña"
    mensaje["From"] = settings.SMTP_FROM
    mensaje["To"] = usuario.correo
    mensaje.set_content(
        "Solicitaste cambiar tu contraseña. Abre este enlace para continuar:\n\n"
        f"{enlace}\n\nEl enlace expira en 30 minutos. Si no lo solicitaste, ignora este mensaje."
    )

    def enviar():
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(mensaje)

    await run_in_threadpool(enviar)
    return {
        "mensaje": "Si la cuenta existe, recibirás instrucciones de recuperación.",
    }


async def confirmar_recuperacion_contrasena(
    db: AsyncSession,
    data: ConfirmacionRecuperacionContrasena,
):
    payload = verificar_token_recuperacion(data.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido o expiró"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido"
        )

    usuario = await crud.obtener_por_id(db, int(user_id))
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    usuario.contrasena = hash_contrasena(data.nueva_contrasena)
    return await crud.actualizar(db, usuario)
