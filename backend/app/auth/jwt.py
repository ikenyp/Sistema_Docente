from datetime import datetime, timedelta
from jose import jwt, JWTError

from app.core.config import settings

def crear_access_token(data: dict, expires_delta: int | None = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=expires_delta or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def crear_token_recuperacion(data: dict, expires_delta: int | None = 30):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=expires_delta or 30)

    to_encode.update({"exp": expire, "purpose": "password_reset"})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def verificar_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def verificar_token_recuperacion(token: str):
    payload = verificar_token(token)
    if not payload or payload.get("purpose") != "password_reset":
        return None
    return payload
