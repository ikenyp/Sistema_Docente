"""add eliminado columns to estudiantes and materias

Revision ID: 9f2a4b1c6d78
Revises: 5bc5e2e90f28
Create Date: 2026-01-06 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "9f2a4b1c6d78"
down_revision: Union[str, Sequence[str], None] = "5bc5e2e90f28"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)
    estudiantes_cols = {col["name"] for col in inspector.get_columns("estudiantes")}
    materias_cols = {col["name"] for col in inspector.get_columns("materias")}

    if "eliminado" not in estudiantes_cols:
        op.add_column(
            "estudiantes",
            sa.Column("eliminado", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )

    if "eliminado" not in materias_cols:
        op.add_column(
            "materias",
            sa.Column("eliminado", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("materias") as batch_op:
        try:
            batch_op.drop_column("eliminado")
        except Exception:
            pass

    with op.batch_alter_table("estudiantes") as batch_op:
        try:
            batch_op.drop_column("eliminado")
        except Exception:
            pass
