"""make materia codigo unique only for active rows

Revision ID: r2s3t4u5v6w7
Revises: q7w8e9r0t1y2
Create Date: 2026-08-24 12:42:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r2s3t4u5v6w7"
down_revision: Union[str, Sequence[str], None] = "q7w8e9r0t1y2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("alter table materias drop constraint if exists uq_materia_contexto_codigo"))
    op.execute(
        sa.text(
            "create unique index if not exists ix_materia_contexto_codigo_activo "
            "on materias (id_contexto, codigo) where eliminado = false"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("drop index if exists ix_materia_contexto_codigo_activo"))
    op.create_unique_constraint(
        "uq_materia_contexto_codigo",
        "materias",
        ["id_contexto", "codigo"],
    )
