from pathlib import Path
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.models.enums import RolUsuarioEnum
from app.services.authorization_mode import validar_gestion_por_modo


def request_with_mode(mode: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-app-mode", mode.encode())],
        }
    )


def usuario(rol: RolUsuarioEnum):
    return SimpleNamespace(rol=rol, id_usuario=1)


def test_docente_puede_gestionar_en_modo_personal():
    validar_gestion_por_modo(
        usuario(RolUsuarioEnum.docente),
        request_with_mode("personal"),
        "cursos",
    )


def test_administrativo_no_puede_gestionar_en_modo_personal():
    with pytest.raises(HTTPException) as excinfo:
        validar_gestion_por_modo(
            usuario(RolUsuarioEnum.administrativo),
            request_with_mode("personal"),
            "cursos",
        )

    assert excinfo.value.status_code == 403
    assert "solo docentes" in excinfo.value.detail


def test_administrativo_puede_gestionar_en_modo_institucional():
    validar_gestion_por_modo(
        usuario(RolUsuarioEnum.administrativo),
        request_with_mode("institucional"),
        "cursos",
    )


def test_docente_no_puede_gestionar_estructura_institucional():
    with pytest.raises(HTTPException) as excinfo:
        validar_gestion_por_modo(
            usuario(RolUsuarioEnum.docente),
            request_with_mode("institucional"),
            "cursos",
        )

    assert excinfo.value.status_code == 403
    assert "administrativos" in excinfo.value.detail
