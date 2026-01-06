"""update cursos_materias_docentes constraint to include id_docente

Revision ID: f8e4c2a9b1d7
Revises: a12c92e0b77f
Create Date: 2026-01-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8e4c2a9b1d7'
down_revision: Union[str, Sequence[str], None] = 'a12c92e0b77f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Eliminar el constraint anterior
    op.drop_constraint('uq_curso_materia', 'cursos_materias_docentes', type_='unique')
    # Crear el nuevo constraint con las 3 columnas
    op.create_unique_constraint('uq_curso_materia_docente', 'cursos_materias_docentes', ['id_curso', 'id_materia', 'id_docente'])


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar el nuevo constraint
    op.drop_constraint('uq_curso_materia_docente', 'cursos_materias_docentes', type_='unique')
    # Restaurar el constraint anterior
    op.create_unique_constraint('uq_curso_materia', 'cursos_materias_docentes', ['id_curso', 'id_materia'])
