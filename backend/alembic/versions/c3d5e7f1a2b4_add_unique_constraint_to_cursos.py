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
    # Agregar constraint único para nombre + anio_lectivo
    op.create_unique_constraint('uq_curso_nombre_anio', 'cursos', ['nombre', 'anio_lectivo'])


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar el constraint
    op.drop_constraint('uq_curso_nombre_anio', 'cursos', type_='unique')
