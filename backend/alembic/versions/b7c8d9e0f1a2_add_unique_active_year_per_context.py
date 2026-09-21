"""enforce one active school year per context

Revision ID: b7c8d9e0f1a2
Revises: z0y1x2w3v4u5
Create Date: 2026-09-16 09:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "z0y1x2w3v4u5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM anios_lectivos
                    WHERE activo = true
                    GROUP BY id_contexto
                    HAVING COUNT(*) > 1
                ) THEN
                    RAISE EXCEPTION
                        'No se puede crear uq_anio_activo_por_contexto: existen varios años activos en un contexto';
                END IF;
            END $$;
            """
        )
    )
    op.create_index(
        "uq_anio_activo_por_contexto",
        "anios_lectivos",
        ["id_contexto"],
        unique=True,
        postgresql_where=sa.text("activo = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_anio_activo_por_contexto",
        table_name="anios_lectivos",
    )
