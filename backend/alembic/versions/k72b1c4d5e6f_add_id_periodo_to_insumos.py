"""add id_periodo to insumos

Revision ID: k72b1c4d5e6f
Revises: j91a2c3d4e5f
Create Date: 2026-08-04 15:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k72b1c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "j91a2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("insumos", sa.Column("id_periodo", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_insumos_id_periodo",
        "insumos",
        "periodos_academicos",
        ["id_periodo"],
        ["id_periodo"],
        ondelete="CASCADE",
    )

    op.execute(
        """
        UPDATE insumos i
        SET id_periodo = pa.id_periodo
        FROM trimestres t
        JOIN configuracion_periodizacion cp
          ON cp.id_contexto = t.id_contexto
         AND cp.anio_lectivo = t.anio_lectivo
        JOIN periodos_academicos pa
          ON pa.id_config_periodizacion = cp.id_config_periodizacion
         AND pa.numero_periodo = t.numero_trimestre
        WHERE i.id_trimestre = t.id_trimestre
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_insumos_id_periodo", "insumos", type_="foreignkey")
    op.drop_column("insumos", "id_periodo")
