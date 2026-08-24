"""versionar estructuras academicas por anio lectivo

Revision ID: x1y2z3a4b5c6
Revises: m1g2r3e4r5g6e
Create Date: 2026-08-20 05:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "x1y2z3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "m1g2r3e4r5g6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "estructuras_academicas",
        sa.Column("anio_lectivo", sa.String(length=9), nullable=True),
    )
    op.execute(
        "UPDATE estructuras_academicas SET anio_lectivo = '2026-2027' WHERE anio_lectivo IS NULL"
    )
    op.alter_column(
        "estructuras_academicas",
        "anio_lectivo",
        existing_type=sa.String(length=9),
        nullable=False,
    )
    op.drop_constraint(
        "uq_estructura_academica_contexto_nombre",
        "estructuras_academicas",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_estructura_academica_contexto_anio_nombre",
        "estructuras_academicas",
        ["id_contexto", "anio_lectivo", "nombre"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_estructura_academica_contexto_anio_nombre",
        "estructuras_academicas",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_estructura_academica_contexto_nombre",
        "estructuras_academicas",
        ["id_contexto", "nombre"],
    )
    op.drop_column("estructuras_academicas", "anio_lectivo")
