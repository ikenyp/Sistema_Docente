"""Agregar identificador de un solo uso para recuperación

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
"""

from alembic import op
import sqlalchemy as sa


revision = "e0f1a2b3c4d5"
down_revision = "d9e0f1a2b3c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("password_reset_jti", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "password_reset_jti")
