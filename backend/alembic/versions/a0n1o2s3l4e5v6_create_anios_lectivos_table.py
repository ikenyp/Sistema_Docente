"""create anios lectivos table

Revision ID: a0n1o2s3l4e5v6
Revises: m1g2r3e4r5g6e
Create Date: 2026-08-20 00:55:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0n1o2s3l4e5v6"
down_revision: Union[str, Sequence[str], None] = "m1g2r3e4r5g6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "anios_lectivos",
        sa.Column("id_anio_lectivo", sa.Integer(), primary_key=True),
        sa.Column("id_contexto", sa.Integer(), nullable=False),
        sa.Column("anio_lectivo", sa.String(length=20), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("cerrado_en", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["id_contexto"], ["contextos.id_contexto"], ondelete="CASCADE"),
        sa.UniqueConstraint("id_contexto", "anio_lectivo", name="uq_anio_lectivo_contexto_anio"),
    )
    op.create_index(
        "ix_anios_lectivos_id_anio_lectivo",
        "anios_lectivos",
        ["id_anio_lectivo"],
    )


def downgrade() -> None:
    op.drop_index("ix_anios_lectivos_id_anio_lectivo", table_name="anios_lectivos")
    op.drop_table("anios_lectivos")
