"""normalize anio lectivo format

Revision ID: n1b2c3d4e5f6g
Revises: j91a2c3d4e5f
Create Date: 2026-08-20 00:06:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "n1b2c3d4e5f6g"
down_revision: Union[str, Sequence[str], None] = "j91a2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalizar(valor: str | None) -> str | None:
    if not valor:
        return valor
    valor = str(valor).strip()
    if len(valor) == 4 and valor.isdigit():
        return f"{valor}-{int(valor) + 1}"
    return valor


def upgrade() -> None:
    bind = op.get_bind()

    cursos = bind.execute(sa.text("SELECT id_curso, anio_lectivo FROM cursos")).fetchall()
    for row in cursos:
        nuevo = _normalizar(row.anio_lectivo)
        if nuevo != row.anio_lectivo:
            bind.execute(
                sa.text("UPDATE cursos SET anio_lectivo = :nuevo WHERE id_curso = :id"),
                {"nuevo": nuevo, "id": row.id_curso},
            )

    configs = bind.execute(
        sa.text("SELECT id_config_periodizacion, anio_lectivo FROM configuracion_periodizacion")
    ).fetchall()
    for row in configs:
        nuevo = _normalizar(row.anio_lectivo)
        if nuevo != row.anio_lectivo:
            bind.execute(
                sa.text(
                    "UPDATE configuracion_periodizacion SET anio_lectivo = :nuevo WHERE id_config_periodizacion = :id"
                ),
                {"nuevo": nuevo, "id": row.id_config_periodizacion},
            )


def downgrade() -> None:
    bind = op.get_bind()

    cursos = bind.execute(
        sa.text("SELECT id_curso, anio_lectivo FROM cursos WHERE anio_lectivo ~ '^[0-9]{4}-[0-9]{4}$'")
    ).fetchall()
    for row in cursos:
        inicio, fin = row.anio_lectivo.split("-", 1)
        if fin == str(int(inicio) + 1):
            bind.execute(
                sa.text("UPDATE cursos SET anio_lectivo = :nuevo WHERE id_curso = :id"),
                {"nuevo": inicio, "id": row.id_curso},
            )

    configs = bind.execute(
        sa.text(
            "SELECT id_config_periodizacion, anio_lectivo FROM configuracion_periodizacion WHERE anio_lectivo ~ '^[0-9]{4}-[0-9]{4}$'"
        )
    ).fetchall()
    for row in configs:
        inicio, fin = row.anio_lectivo.split("-", 1)
        if fin == str(int(inicio) + 1):
            bind.execute(
                sa.text(
                    "UPDATE configuracion_periodizacion SET anio_lectivo = :nuevo WHERE id_config_periodizacion = :id"
                ),
                {"nuevo": inicio, "id": row.id_config_periodizacion},
            )
