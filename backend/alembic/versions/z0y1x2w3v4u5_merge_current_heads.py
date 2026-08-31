"""merge current alembic heads

Revision ID: z0y1x2w3v4u5
Revises: a0n1o2s3l4e5v6, r2s3t4u5v6w7, u7v8w9x0y1z2
Create Date: 2026-08-26 02:30:00.000000

"""

from typing import Sequence, Union


revision: str = "z0y1x2w3v4u5"
down_revision: Union[str, Sequence[str], None] = (
    "a0n1o2s3l4e5v6",
    "r2s3t4u5v6w7",
    "u7v8w9x0y1z2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
