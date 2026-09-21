import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.validaciones_academicas import (
    validar_calificacion,
    validar_estudiante_en_curso,
    manejar_error_integridad,
    validar_ponderacion,
)


def test_estudiante_matriculado_en_curso_es_valido():
    validar_estudiante_en_curso(SimpleNamespace(id_curso_actual=10), 10)


def test_estudiante_de_otro_curso_es_rechazado():
    with pytest.raises(HTTPException) as excinfo:
        validar_estudiante_en_curso(SimpleNamespace(id_curso_actual=10), 20)

    assert excinfo.value.status_code == 400
    assert "no está matriculado" in excinfo.value.detail


@pytest.mark.parametrize("calificacion", [-0.01, 10.01])
def test_calificacion_fuera_de_rango_es_rechazada(calificacion):
    with pytest.raises(HTTPException) as excinfo:
        validar_calificacion(calificacion)

    assert excinfo.value.status_code == 400


@pytest.mark.parametrize("ponderacion", [0, 10.01])
def test_ponderacion_fuera_de_rango_es_rechazada(ponderacion):
    with pytest.raises(HTTPException) as excinfo:
        validar_ponderacion(ponderacion)

    assert excinfo.value.status_code == 400


def test_error_integridad_hace_rollback_antes_de_responder():
    class FakeSession:
        rolled_back = False

        async def rollback(self):
            self.rolled_back = True

    session = FakeSession()
    with pytest.raises(HTTPException) as excinfo:
        asyncio.run(manejar_error_integridad(session, "Registro duplicado"))

    assert session.rolled_back is True
    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Registro duplicado"
