from decimal import Decimal
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.promedios import (
    PONDERACION_ACTIVIDADES,
    PONDERACION_EXAMEN,
    PONDERACION_PROYECTO,
    calcular_promedio_acumulado,
)


def test_ponderaciones_del_periodo_suman_cien_por_ciento():
    total = (
        PONDERACION_ACTIVIDADES
        + PONDERACION_PROYECTO
        + PONDERACION_EXAMEN
    )

    assert total == Decimal("1.00")
    assert PONDERACION_ACTIVIDADES == Decimal("0.70")
    assert PONDERACION_PROYECTO == Decimal("0.10")
    assert PONDERACION_EXAMEN == Decimal("0.20")


def test_promedio_acumulado_considera_periodos_sin_datos():
    assert calcular_promedio_acumulado(Decimal("10"), 3, 1) == 3.33


def test_promedio_acumulado_sin_datos_es_nulo():
    assert calcular_promedio_acumulado(Decimal("0"), 3, 0) is None
