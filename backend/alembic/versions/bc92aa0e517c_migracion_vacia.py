"""Migracion vacia

Revision ID: bc92aa0e517c
Revises: 974f3bff1341
Create Date: 2025-12-15 22:41:41.667591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de revision utilizados por Alembic.
revision: str = 'bc92aa0e517c'
down_revision: Union[str, Sequence[str], None] = '974f3bff1341'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplicar cambios al esquema."""
    # ### comandos generados por Alembic; revisar si es necesario ###
    pass
    # ### fin de los comandos de Alembic ###


def downgrade() -> None:
    """Revertir cambios del esquema."""
    # ### comandos generados por Alembic; revisar si es necesario ###
    pass
    # ### fin de los comandos de Alembic ###
