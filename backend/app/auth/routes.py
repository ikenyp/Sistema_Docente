from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_session
from app.services.auth import autenticar_usuario

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

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
