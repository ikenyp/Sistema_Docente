"""add attendance and course subject assignment constraints

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-09-16 09:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_asistencia_cmd_estudiante_fecha",
        "asistencia",
        ["id_cmd", "id_estudiante", "fecha"],
    )
    op.create_unique_constraint(
        "uq_curso_materia_unico_docente",
        "cursos_materias_docentes",
        ["id_curso", "id_materia"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_curso_materia_unico_docente",
        "cursos_materias_docentes",
        type_="unique",
    )
    op.drop_constraint(
        "uq_asistencia_cmd_estudiante_fecha",
        "asistencia",
        type_="unique",
    )
