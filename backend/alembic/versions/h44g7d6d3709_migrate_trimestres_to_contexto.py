"""Migrate trimestres from curso-based to contexto-based

Revision ID: h44g7d6d3709
Revises: b1a3d9e4f701
Create Date: 2026-05-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h44g7d6d3709'
down_revision: Union[str, Sequence[str], None] = 'b1a3d9e4f701'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: Migrate trimestres to use id_contexto instead of id_curso"""
    
    # Step 1: Add new id_contexto column
    op.add_column('trimestres', sa.Column('id_contexto', sa.Integer(), nullable=True))
    
    # Step 2: Populate id_contexto from cursos table
    op.execute("""
        UPDATE trimestres 
        SET id_contexto = cursos.id_contexto 
        FROM cursos 
        WHERE trimestres.id_curso = cursos.id_curso
    """)
    
    # Step 3: Make id_contexto NOT NULL
    op.alter_column('trimestres', 'id_contexto', existing_type=sa.Integer(), nullable=False)
    
    # Step 4: Add FK to contextos
    op.create_foreign_key(
        'fk_trimestres_id_contexto',
        'trimestres',
        'contextos',
        ['id_contexto'],
        ['id_contexto'],
        ondelete='CASCADE'
    )
    
    # Step 5: Drop old FK to cursos
    op.drop_constraint('trimestres_id_curso_fkey', 'trimestres', type_='foreignkey')
    
    # Step 6: Drop old id_curso column
    op.drop_column('trimestres', 'id_curso')


def downgrade() -> None:
    """Downgrade: Revert trimestres back to curso-based"""
    
    # Step 1: Add back id_curso column
    op.add_column('trimestres', sa.Column('id_curso', sa.Integer(), nullable=True))
    
    # Step 2: Populate id_curso from contextos
    op.execute("""
        UPDATE trimestres 
        SET id_curso = cursos.id_curso 
        FROM cursos 
        WHERE trimestres.id_contexto = cursos.id_contexto
        LIMIT 1
    """)
    
    # Step 3: Make id_curso NOT NULL
    op.alter_column('trimestres', 'id_curso', existing_type=sa.Integer(), nullable=False)
    
    # Step 4: Add FK back to cursos
    op.create_foreign_key(
        'trimestres_id_curso_fkey',
        'trimestres',
        'cursos',
        ['id_curso'],
        ['id_curso'],
        ondelete='CASCADE'
    )
    
    # Step 5: Drop FK to contextos
    op.drop_constraint('fk_trimestres_id_contexto', 'trimestres', type_='foreignkey')
    
    # Step 6: Drop id_contexto column
    op.drop_column('trimestres', 'id_contexto')
