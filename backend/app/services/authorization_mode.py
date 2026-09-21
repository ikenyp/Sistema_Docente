from fastapi import HTTPException, Request, status

from app.core.app_mode import is_personal_mode
from app.schemas.usuarios import RolUsuarioEnum


def validar_gestion_por_modo(
    current_user,
    request: Request,
    recurso: str,
) -> None:
    # El docente gestiona su espacio personal; la estructura institucional
    # queda reservada para administración aunque ambos roles puedan consultarla.
    if is_personal_mode(request):
        if current_user.rol != RolUsuarioEnum.docente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"En modo personal solo docentes pueden gestionar {recurso}",
            )
    elif current_user.rol != RolUsuarioEnum.administrativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Solo administrativos pueden gestionar {recurso}",
        )
