"""make_tutor_nullable_in_cursos

Revision ID: f22e5b4b1507
Revises: d4e6f8g2b3c5
Create Date: 2026-01-06 04:33:16.656314

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f22e5b4b1507'
down_revision: Union[str, Sequence[str], None] = 'd4e6f8g2b3c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Hacer id_tutor nullable
    op.alter_column('cursos', 'id_tutor',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Revertir id_tutor a NOT NULL
    op.alter_column('cursos', 'id_tutor',
               existing_type=sa.INTEGER(),
               nullable=False)
