"""add estructura academica tables

Revision ID: p15e4f7a8b9c
Revises: n94d3e6f7g8h
Create Date: 2026-08-05 02:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p15e4f7a8b9c"
down_revision: Union[str, Sequence[str], None] = "n94d3e6f7g8h"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "estructuras_academicas",
        sa.Column("id_estructura_academica", sa.Integer(), primary_key=True),
        sa.Column("id_contexto", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("nivel", sa.String(length=80), nullable=False),
        sa.Column("subnivel", sa.String(length=80), nullable=True),
        sa.Column("modalidad", sa.String(length=80), nullable=True),
        sa.Column("especialidad", sa.String(length=120), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["id_contexto"], ["contextos.id_contexto"]),
        sa.UniqueConstraint(
            "id_contexto",
            "nombre",
            name="uq_estructura_academica_contexto_nombre",
        ),
    )

    op.create_table(
        "estructuras_materias",
        sa.Column("id_estructura_materia", sa.Integer(), primary_key=True),
        sa.Column("id_estructura_academica", sa.Integer(), nullable=False),
        sa.Column("id_materia", sa.Integer(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("obligatoria", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(
            ["id_estructura_academica"],
            ["estructuras_academicas.id_estructura_academica"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["id_materia"], ["materias.id_materia"]),
        sa.UniqueConstraint(
            "id_estructura_academica",
            "id_materia",
            name="uq_estructura_materia",
        ),
    )

    op.add_column(
        "cursos",
        sa.Column("id_estructura_academica", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_cursos_estructura_academica",
        "cursos",
        "estructuras_academicas",
        ["id_estructura_academica"],
        ["id_estructura_academica"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_cursos_estructura_academica", "cursos", type_="foreignkey")
    op.drop_column("cursos", "id_estructura_academica")
    op.drop_table("estructuras_materias")
    op.drop_table("estructuras_academicas")
