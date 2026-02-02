"""fix_insumo_constraint_allow_multiple_actividades

Revision ID: e731e43734b9
Revises: 9f2a4b1c6d78
Create Date: 2026-01-22 01:40:37.404007
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = 'e731e43734b9'
down_revision: Union[str, Sequence[str], None] = '9f2a4b1c6d78'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------
    # 1️⃣ LIMPIEZA SEGURA (evita duplicados)
    # -------------------------------------------------

    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_curso_nombre_anio'
        ) THEN
            ALTER TABLE cursos DROP CONSTRAINT uq_curso_nombre_anio;
        END IF;
    END $$;
    """)

    op.execute("""
    DROP INDEX IF EXISTS ix_trimestres_id_trimestre;
    """)

    # -------------------------------------------------
    # 2️⃣ INSUMOS: permitir múltiples actividades
    # -------------------------------------------------

    op.drop_constraint(
        'uq_proyecto_examen_por_trimestre',
        'insumos',
        type_='unique'
    )

    op.alter_column(
        'insumos',
        'id_trimestre',
        existing_type=sa.INTEGER(),
        nullable=False
    )

    op.alter_column(
        'insumos',
        'tipo_insumo',
        existing_type=postgresql.ENUM(
            'actividad',
            'proyecto_trimestral',
            'examen_trimestral',
            name='tipoinsumoenum'
        ),
        nullable=False
    )

    # -------------------------------------------------
    # 3️⃣ Campos eliminados / activos
    # -------------------------------------------------

    op.alter_column(
        'estudiantes',
        'eliminado',
        existing_type=sa.BOOLEAN(),
        nullable=True,
        existing_server_default=sa.text('false')
    )

    op.alter_column(
        'materias',
        'eliminado',
        existing_type=sa.BOOLEAN(),
        nullable=True,
        existing_server_default=sa.text('false')
    )

    op.alter_column(
        'usuarios',
        'activo',
        existing_type=sa.BOOLEAN(),
        nullable=True,
        existing_server_default=sa.text('true')
    )

    # -------------------------------------------------
    # 4️⃣ Recrear índice de forma segura
    # -------------------------------------------------

    op.create_index(
        'ix_trimestres_id_trimestre',
        'trimestres',
        ['id_trimestre'],
        unique=False
    )


def downgrade() -> None:
    # -------------------------------------------------
    # Downgrade seguro
    # -------------------------------------------------

    op.drop_index(
        'ix_trimestres_id_trimestre',
        table_name='trimestres'
    )

    op.alter_column(
        'usuarios',
        'activo',
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text('true')
    )

    op.alter_column(
        'materias',
        'eliminado',
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text('false')
    )

    op.alter_column(
        'insumos',
        'tipo_insumo',
        existing_type=postgresql.ENUM(
            'actividad',
            'proyecto_trimestral',
            'examen_trimestral',
            name='tipoinsumoenum'
        ),
        nullable=True
    )

    op.alter_column(
        'insumos',
        'id_trimestre',
        existing_type=sa.INTEGER(),
        nullable=True
    )

    op.create_unique_constraint(
        'uq_proyecto_examen_por_trimestre',
        'insumos',
        ['id_cmd', 'id_trimestre', 'tipo_insumo']
    )

    op.alter_column(
        'estudiantes',
        'eliminado',
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text('false')
    )
