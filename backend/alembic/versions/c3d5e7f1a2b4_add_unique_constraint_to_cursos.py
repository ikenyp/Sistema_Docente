"""add_unique_constraint_to_cursos

Revision ID: c3d5e7f1a2b4
Revises: f8e4c2a9b1d7
Create Date: 2026-01-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d5e7f1a2b4'
down_revision: Union[str, Sequence[str], None] = 'f8e4c2a9b1d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Eliminar filas duplicadas (mantener la de menor id) antes de crear el constraint
    op.execute(
        """
        WITH duplicates AS (
            SELECT id_curso, ROW_NUMBER() OVER (PARTITION BY nombre, anio_lectivo ORDER BY id_curso) AS rn
            FROM cursos
        )
        DELETE FROM cursos
        WHERE id_curso IN (SELECT id_curso FROM duplicates WHERE rn > 1);
        """
    )

    # Agregar constraint único para nombre + anio_lectivo
    op.create_unique_constraint('uq_curso_nombre_anio', 'cursos', ['nombre', 'anio_lectivo'])


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar el constraint
    op.drop_constraint('uq_curso_nombre_anio', 'cursos', type_='unique')
