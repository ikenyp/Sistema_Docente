"""remove_id_docente_from_cursos

Revision ID: a12c92e0b77f
Revises: 60b49a409f2d
Create Date: 2026-01-05 22:36:30.955216

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a12c92e0b77f'
down_revision: Union[str, Sequence[str], None] = '60b49a409f2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Eliminar foreign key constraint primero
    op.drop_constraint('cursos_id_docente_fkey', 'cursos', type_='foreignkey')
    # Eliminar columna id_docente
    op.drop_column('cursos', 'id_docente')


def downgrade() -> None:
    """Downgrade schema."""
    # Agregar columna id_docente de vuelta
    op.add_column('cursos', sa.Column('id_docente', sa.Integer(), nullable=False))
    # Recrear foreign key constraint
    op.create_foreign_key('cursos_id_docente_fkey', 'cursos', 'usuarios', ['id_docente'], ['id_usuario'])
