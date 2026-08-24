"""merge alembic heads

Revision ID: m1g2r3e4r5g6e
Revises: n1b2c3d4e5f6g, p15e4f7a8b9c
Create Date: 2026-08-20 00:18:00.000000
"""

from typing import Sequence, Union


revision: str = "m1g2r3e4r5g6e"
down_revision: Union[str, Sequence[str], None] = ("n1b2c3d4e5f6g", "p15e4f7a8b9c")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
