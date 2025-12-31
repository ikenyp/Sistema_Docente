"""add activo column to usuarios

Revision ID: eebaa2f0ff3b
Revises: bc92aa0e517c
Create Date: 2025-12-31 16:51:47.944310

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eebaa2f0ff3b'
down_revision: Union[str, Sequence[str], None] = 'bc92aa0e517c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('usuarios', sa.Column('activo', sa.Boolean(), server_default='true', nullable=False))

def downgrade():
    op.drop_column('usuarios', 'activo')