from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.concurrency import run_in_threadpool
from email.message import EmailMessage
import html
import hashlib
import secrets
import smtplib
from datetime import datetime, timedelta

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
from app.models.password_reset_requests import PasswordResetRequest
from sqlalchemy import func, select
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
    ip_address: str = "unknown",
):
    email_hash = hashlib.sha256(data.correo.strip().lower().encode()).hexdigest()
    limite_desde = datetime.utcnow() - timedelta(hours=1)
    recientes_correo = await db.scalar(
        select(func.count(PasswordResetRequest.id_request)).where(
            PasswordResetRequest.email_hash == email_hash,
            PasswordResetRequest.created_at >= limite_desde,
        ),
    )
    recientes_ip = await db.scalar(
        select(func.count(PasswordResetRequest.id_request)).where(
            PasswordResetRequest.ip_address == ip_address,
            PasswordResetRequest.created_at >= limite_desde,
        ),
    )
    if (recientes_correo or 0) >= 5 or (recientes_ip or 0) >= 20:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has solicitado demasiados enlaces. Intenta nuevamente más tarde.",
        )
    db.add(PasswordResetRequest(email_hash=email_hash, ip_address=ip_address))
    await db.commit()

    usuario = await obtener_por_correo(db, data.correo)
    if not usuario:
        return {"mensaje": "Si la cuenta existe, recibirás instrucciones de recuperación."}

    reset_jti = secrets.token_urlsafe(32)
    token = crear_token_recuperacion({"sub": str(usuario.id_usuario), "jti": reset_jti})
    usuario.password_reset_jti = hashlib.sha256(reset_jti.encode()).hexdigest()
    await db.commit()
    if not settings.SMTP_ENABLED or not all((settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, settings.SMTP_FROM)):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="El servicio de recuperación no está disponible")

    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/#view=recover&token={token}"
    mensaje = EmailMessage()
    mensaje["Subject"] = "Recuperación de contraseña"
    mensaje["From"] = settings.SMTP_FROM
    mensaje["To"] = usuario.correo
    mensaje.set_content(
        "Solicitaste cambiar tu contraseña. Abre este enlace para continuar:\n\n"
        f"{enlace}\n\nEl enlace expira en 30 minutos. Si no lo solicitaste, ignora este mensaje."
    )
    mensaje.add_alternative(
        f"""
        <html><body style="font-family:Arial,sans-serif;color:#223553;line-height:1.5">
          <h2 style="color:#223553">Recuperación de contraseña</h2>
          <p>Solicitaste cambiar tu contraseña en Sistema Docente.</p>
          <p><a href="{html.escape(enlace)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#5278b2;color:#fff;text-decoration:none;font-weight:700">Cambiar contraseña</a></p>
          <p>El enlace expira en 30 minutos. Si no realizaste esta solicitud, puedes ignorar este correo.</p>
        </body></html>
        """,
        subtype="html",
    )

    def enviar():
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(mensaje)

    try:
        await run_in_threadpool(enviar)
    except smtplib.SMTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "El proveedor de correo rechazó el envío. Para enviar a otros "
                "destinatarios debes verificar un dominio en Resend."
            ),
        ) from exc
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
    token_jti = payload.get("jti")
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

    token_jti_hash = hashlib.sha256(token_jti.encode()).hexdigest() if token_jti else ""
    if not token_jti_hash or usuario.password_reset_jti != token_jti_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación ya fue utilizado o reemplazado",
        )

    usuario.contrasena = hash_contrasena(data.nueva_contrasena)
    usuario.password_reset_jti = None
    return await crud.actualizar(db, usuario)
