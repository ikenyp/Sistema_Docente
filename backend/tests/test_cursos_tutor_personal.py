from pathlib import Path
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.cursos import validar_tutor_unico_por_contexto


def test_validar_tutor_unico_rechaza_segundo_curso():
    cursos_existentes = [
        SimpleNamespace(id_curso=1, id_tutor=17),
        SimpleNamespace(id_curso=2, id_tutor=None),
    ]

    with pytest.raises(HTTPException) as excinfo:
        validar_tutor_unico_por_contexto(
            curso_actual_id=2,
            id_tutor=17,
            cursos_existentes=cursos_existentes,
        )

    assert "solo puede ser tutor de un curso" in str(excinfo.value.detail)


def test_validar_tutor_unico_permite_primer_curso():
    cursos_existentes = [
        SimpleNamespace(id_curso=1, id_tutor=None),
        SimpleNamespace(id_curso=2, id_tutor=None),
    ]

    validar_tutor_unico_por_contexto(
        curso_actual_id=2,
        id_tutor=17,
        cursos_existentes=cursos_existentes,
    )
