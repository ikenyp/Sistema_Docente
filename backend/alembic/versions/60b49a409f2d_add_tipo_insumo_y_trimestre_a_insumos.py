"""add_tipo_insumo_y_trimestre_a_insumos

Revision ID: 60b49a409f2d
Revises: eebaa2f0ff3b
Create Date: 2026-01-06 04:01:13.229586

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60b49a409f2d'
down_revision: Union[str, Sequence[str], None] = 'eebaa2f0ff3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Crear el enum para tipo_insumo
    tipo_insumo_enum = sa.Enum('actividad', 'proyecto_trimestral', 'examen_trimestral', 
                                 name='tipoinsmoenum', schema=None)
    tipo_insumo_enum.create(op.get_bind(), checkfirst=True)
    
    # Agregar columnas tipo_insumo y trimestre
    op.add_column('insumos', sa.Column('tipo_insumo', tipo_insumo_enum, nullable=True))
    op.add_column('insumos', sa.Column('trimestre', sa.Integer(), nullable=True))
    
    # Actualizar registros existentes con valores por defecto
    op.execute("UPDATE insumos SET tipo_insumo = 'actividad', trimestre = 1 WHERE tipo_insumo IS NULL")
    
    # Hacer las columnas NOT NULL después de llenarlas
    op.alter_column('insumos', 'tipo_insumo', nullable=False)
    op.alter_column('insumos', 'trimestre', nullable=False)
    
    # Crear la constraint única para proyectos y exámenes por trimestre
    # Esta constraint asegura que solo haya un proyecto_trimestral o examen_trimestral
    # por trimestre y por curso-materia
    op.create_unique_constraint(
        'uq_proyecto_examen_por_trimestre',
        'insumos',
        ['id_cmd', 'trimestre', 'tipo_insumo']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar la constraint única
    op.drop_constraint('uq_proyecto_examen_por_trimestre', 'insumos', type_='unique')
    
    # Eliminar las columnas
    op.drop_column('insumos', 'trimestre')
    op.drop_column('insumos', 'tipo_insumo')
    
    # Eliminar el enum
    sa.Enum(name='tipoinsmoenum').drop(op.get_bind(), checkfirst=True)
