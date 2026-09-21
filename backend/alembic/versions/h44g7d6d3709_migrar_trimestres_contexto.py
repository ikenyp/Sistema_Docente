"""Migrar trimestres del curso al contexto

Revision ID: h44g7d6d3709
Revises: b1a3d9e4f701
Create Date: 2026-05-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de revision utilizados por Alembic.
revision: str = 'h44g7d6d3709'
down_revision: Union[str, Sequence[str], None] = 'b1a3d9e4f701'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplicar: usar id_contexto en lugar de id_curso para trimestres."""
    
    # Paso 1: agregar la columna id_contexto
    op.add_column('trimestres', sa.Column('id_contexto', sa.Integer(), nullable=True))
    
    # Paso 2: completar id_contexto desde la tabla de cursos
    op.execute("""
        UPDATE trimestres 
        SET id_contexto = cursos.id_contexto 
        FROM cursos 
        WHERE trimestres.id_curso = cursos.id_curso
    """)
    
    # Paso 3: hacer id_contexto obligatorio
    op.alter_column('trimestres', 'id_contexto', existing_type=sa.Integer(), nullable=False)
    
    # Paso 4: agregar clave foranea a contextos
    op.create_foreign_key(
        'fk_trimestres_id_contexto',
        'trimestres',
        'contextos',
        ['id_contexto'],
        ['id_contexto'],
        ondelete='CASCADE'
    )
    
    # Paso 5: eliminar la clave foranea anterior hacia cursos
    op.drop_constraint('trimestres_id_curso_fkey', 'trimestres', type_='foreignkey')
    
    # Paso 6: eliminar la columna id_curso anterior
    op.drop_column('trimestres', 'id_curso')


def downgrade() -> None:
    """Revertir: devolver trimestres al modelo basado en cursos."""
    
    # Paso 1: volver a agregar la columna id_curso
    op.add_column('trimestres', sa.Column('id_curso', sa.Integer(), nullable=True))
    
    # Paso 2: completar id_curso desde contextos
    op.execute("""
        UPDATE trimestres 
        SET id_curso = cursos.id_curso 
        FROM cursos 
        WHERE trimestres.id_contexto = cursos.id_contexto
        LIMIT 1
    """)
    
    # Paso 3: hacer id_curso obligatorio
    op.alter_column('trimestres', 'id_curso', existing_type=sa.Integer(), nullable=False)
    
    # Paso 4: volver a agregar la clave foranea hacia cursos
    op.create_foreign_key(
        'trimestres_id_curso_fkey',
        'trimestres',
        'cursos',
        ['id_curso'],
        ['id_curso'],
        ondelete='CASCADE'
    )
    
    # Paso 5: eliminar la clave foranea hacia contextos
    op.drop_constraint('fk_trimestres_id_contexto', 'trimestres', type_='foreignkey')
    
    # Paso 6: eliminar la columna id_contexto
    op.drop_column('trimestres', 'id_contexto')
