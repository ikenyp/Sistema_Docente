"""add codigo y descripcion to materias

Revision ID: q7w8e9r0t1y2
Revises: x1y2z3a4b5c6
Create Date: 2026-08-23 23:14:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "q7w8e9r0t1y2"
down_revision: Union[str, Sequence[str], None] = "x1y2z3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columnas = {col["name"] for col in inspector.get_columns("materias")}
    uniques = {uq.get("name") for uq in inspector.get_unique_constraints("materias")}

    if "codigo" not in columnas:
        op.add_column("materias", sa.Column("codigo", sa.String(length=30), nullable=True))
    if "descripcion" not in columnas:
        op.add_column("materias", sa.Column("descripcion", sa.String(length=255), nullable=True))

    if "uq_materia_contexto_codigo" not in uniques:
        op.create_unique_constraint(
            "uq_materia_contexto_codigo",
            "materias",
            ["id_contexto", "codigo"],
        )


def downgrade() -> None:
    op.drop_constraint("uq_materia_contexto_codigo", "materias", type_="unique")
    op.drop_column("materias", "descripcion")
    op.drop_column("materias", "codigo")
