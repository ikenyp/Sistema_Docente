"""add periodizacion tables

Revision ID: j91a2c3d4e5f
Revises: h44g7d6d3709
Create Date: 2026-08-04 14:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j91a2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "h44g7d6d3709"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuracion_periodizacion",
        sa.Column("id_config_periodizacion", sa.Integer(), primary_key=True),
        sa.Column("id_contexto", sa.Integer(), nullable=False),
        sa.Column("anio_lectivo", sa.String(length=20), nullable=False),
        sa.Column("tipo_periodizacion", sa.String(length=20), nullable=False),
        sa.Column("cantidad_periodos", sa.Integer(), nullable=False),
        sa.Column("nombre_periodo_singular", sa.String(length=30), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["id_contexto"], ["contextos.id_contexto"], ondelete="CASCADE"),
        sa.UniqueConstraint("id_contexto", "anio_lectivo", name="uq_config_periodizacion_contexto_anio"),
    )
    op.create_index(
        "ix_configuracion_periodizacion_id_config_periodizacion",
        "configuracion_periodizacion",
        ["id_config_periodizacion"],
    )

    op.create_table(
        "periodos_academicos",
        sa.Column("id_periodo", sa.Integer(), primary_key=True),
        sa.Column("id_config_periodizacion", sa.Integer(), nullable=False),
        sa.Column("numero_periodo", sa.Integer(), nullable=False),
        sa.Column("nombre_periodo", sa.String(length=80), nullable=True),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_config_periodizacion"],
            ["configuracion_periodizacion.id_config_periodizacion"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("id_config_periodizacion", "numero_periodo", name="uq_periodo_config_numero"),
    )
    op.create_index("ix_periodos_academicos_id_periodo", "periodos_academicos", ["id_periodo"])

    op.execute(
        """
        INSERT INTO configuracion_periodizacion (
            id_contexto,
            anio_lectivo,
            tipo_periodizacion,
            cantidad_periodos,
            nombre_periodo_singular,
            activo
        )
        SELECT
            id_contexto,
            anio_lectivo,
            'trimestral',
            3,
            'Trimestre',
            true
        FROM trimestres
        GROUP BY id_contexto, anio_lectivo
        """
    )

    op.execute(
        """
        INSERT INTO periodos_academicos (
            id_config_periodizacion,
            numero_periodo,
            nombre_periodo,
            fecha_inicio,
            fecha_fin
        )
        SELECT
            cp.id_config_periodizacion,
            t.numero_trimestre,
            'Trimestre ' || t.numero_trimestre,
            t.fecha_inicio,
            t.fecha_fin
        FROM trimestres t
        JOIN configuracion_periodizacion cp
          ON cp.id_contexto = t.id_contexto
         AND cp.anio_lectivo = t.anio_lectivo
        """
    )


def downgrade() -> None:
    op.drop_index("ix_periodos_academicos_id_periodo", table_name="periodos_academicos")
    op.drop_table("periodos_academicos")
    op.drop_index(
        "ix_configuracion_periodizacion_id_config_periodizacion",
        table_name="configuracion_periodizacion",
    )
    op.drop_table("configuracion_periodizacion")
