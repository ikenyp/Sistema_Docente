"""drop trimestres legacy

Revision ID: m83c2d5e6f7g
Revises: k72b1c4d5e6f
Create Date: 2026-08-04 16:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m83c2d5e6f7g"
down_revision: Union[str, Sequence[str], None] = "k72b1c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("insumos", "id_periodo", existing_type=sa.Integer(), nullable=False)

    conn = op.get_bind()
    columnas = {
        row[0]
        for row in conn.execute(
            sa.text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'insumos'
                """
            )
        ).fetchall()
    }

    constraint_rows = conn.execute(
        sa.text(
            """
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_class frel ON frel.oid = con.confrelid
            WHERE rel.relname = 'insumos'
              AND frel.relname = 'trimestres'
              AND con.contype = 'f'
            """
        )
    ).fetchall()
    for row in constraint_rows:
        op.drop_constraint(row[0], "insumos", type_="foreignkey")

    if "id_trimestre" in columnas:
        op.drop_column("insumos", "id_trimestre")
    if "trimestre" in columnas:
        op.drop_column("insumos", "trimestre")
    op.drop_table("trimestres")


def downgrade() -> None:
    op.create_table(
        "trimestres",
        sa.Column("id_trimestre", sa.Integer(), primary_key=True),
        sa.Column("id_contexto", sa.Integer(), nullable=False),
        sa.Column("numero_trimestre", sa.Integer(), nullable=False),
        sa.Column("anio_lectivo", sa.String(length=20), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["id_contexto"], ["contextos.id_contexto"], ondelete="CASCADE"),
    )
    op.add_column("insumos", sa.Column("trimestre", sa.Integer(), nullable=True))
    op.add_column("insumos", sa.Column("id_trimestre", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "insumos_id_trimestre_fkey",
        "insumos",
        "trimestres",
        ["id_trimestre"],
        ["id_trimestre"],
        ondelete="CASCADE",
    )
    op.alter_column("insumos", "id_periodo", existing_type=sa.Integer(), nullable=True)
