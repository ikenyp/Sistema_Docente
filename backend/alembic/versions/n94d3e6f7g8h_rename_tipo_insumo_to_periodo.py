"""rename tipo insumo values to periodo

Revision ID: n94d3e6f7g8h
Revises: m83c2d5e6f7g
Create Date: 2026-08-04 19:10:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "n94d3e6f7g8h"
down_revision: Union[str, Sequence[str], None] = "m83c2d5e6f7g"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE tipoinsumoenum RENAME VALUE 'proyecto_trimestral' TO 'proyecto_periodo'")
    op.execute("ALTER TYPE tipoinsumoenum RENAME VALUE 'examen_trimestral' TO 'examen_periodo'")


def downgrade() -> None:
    op.execute("ALTER TYPE tipoinsumoenum RENAME VALUE 'proyecto_periodo' TO 'proyecto_trimestral'")
    op.execute("ALTER TYPE tipoinsumoenum RENAME VALUE 'examen_periodo' TO 'examen_trimestral'")
