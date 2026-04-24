"""add contextos and scope cursos materias

Revision ID: b1a3d9e4f701
Revises: 22f01dce04f4
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'b1a3d9e4f701'
down_revision: Union[str, Sequence[str], None] = '22f01dce04f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contextos',
        sa.Column('id_contexto', sa.Integer(), nullable=False),
        sa.Column('tipo_modo', sa.String(length=20), nullable=False),
        sa.Column('nombre', sa.String(length=120), nullable=False),
        sa.Column('id_owner_docente', sa.Integer(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['id_owner_docente'], ['usuarios.id_usuario']),
        sa.PrimaryKeyConstraint('id_contexto')
    )

    conn = op.get_bind()
    conn.execute(
        text(
            """
            INSERT INTO contextos (id_contexto, tipo_modo, nombre, id_owner_docente, activo)
            VALUES (1, 'institucional', 'Institucional General', NULL, true)
            ON CONFLICT (id_contexto) DO NOTHING;
            """
        )
    )
    conn.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence('contextos', 'id_contexto'),
                COALESCE((SELECT MAX(id_contexto) FROM contextos), 1),
                true
            );
            """
        )
    )

    op.add_column('cursos', sa.Column('id_contexto', sa.Integer(), nullable=True))
    op.add_column('materias', sa.Column('id_contexto', sa.Integer(), nullable=True))

    conn.execute(text("UPDATE cursos SET id_contexto = 1 WHERE id_contexto IS NULL;"))
    conn.execute(text("UPDATE materias SET id_contexto = 1 WHERE id_contexto IS NULL;"))

    op.alter_column('cursos', 'id_contexto', nullable=False)
    op.alter_column('materias', 'id_contexto', nullable=False)

    op.create_foreign_key('fk_cursos_contexto', 'cursos', 'contextos', ['id_contexto'], ['id_contexto'])
    op.create_foreign_key('fk_materias_contexto', 'materias', 'contextos', ['id_contexto'], ['id_contexto'])

    op.drop_constraint('uq_curso_nombre_anio', 'cursos', type_='unique')
    op.create_unique_constraint('uq_curso_contexto_nombre_anio', 'cursos', ['id_contexto', 'nombre', 'anio_lectivo'])


def downgrade() -> None:
    op.drop_constraint('uq_curso_contexto_nombre_anio', 'cursos', type_='unique')
    op.create_unique_constraint('uq_curso_nombre_anio', 'cursos', ['nombre', 'anio_lectivo'])

    op.drop_constraint('fk_materias_contexto', 'materias', type_='foreignkey')
    op.drop_constraint('fk_cursos_contexto', 'cursos', type_='foreignkey')

    op.drop_column('materias', 'id_contexto')
    op.drop_column('cursos', 'id_contexto')

    op.drop_table('contextos')
