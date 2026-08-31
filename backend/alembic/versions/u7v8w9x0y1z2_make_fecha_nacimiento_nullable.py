"""make fecha_nacimiento nullable in estudiantes

Revision ID: u7v8w9x0y1z2
Revises: 9f2a4b1c6d78
Create Date: 2026-08-26 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "u7v8w9x0y1z2"
down_revision: Union[str, Sequence[str], None] = "9f2a4b1c6d78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("estudiantes") as batch_op:
        batch_op.alter_column(
            "fecha_nacimiento",
            existing_type=sa.Date(),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("estudiantes") as batch_op:
        batch_op.alter_column(
            "fecha_nacimiento",
            existing_type=sa.Date(),
            nullable=False,
        )
