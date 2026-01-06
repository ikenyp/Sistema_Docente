"""add_trimestres_table_and_update_insumos

Revision ID: 5bc5e2e90f28
Revises: f22e5b4b1507
Create Date: 2026-01-06 04:44:02.229829

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bc5e2e90f28'
down_revision: Union[str, Sequence[str], None] = 'f22e5b4b1507'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Crear tabla trimestres
    op.create_table('trimestres',
    sa.Column('id_trimestre', sa.Integer(), nullable=False),
    sa.Column('id_curso', sa.Integer(), nullable=False),
    sa.Column('numero_trimestre', sa.Integer(), nullable=False),
    sa.Column('anio_lectivo', sa.String(length=20), nullable=False),
    sa.Column('fecha_inicio', sa.Date(), nullable=False),
    sa.Column('fecha_fin', sa.Date(), nullable=False),
    sa.ForeignKeyConstraint(['id_curso'], ['cursos.id_curso'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_trimestre'),
    sa.UniqueConstraint('id_curso', 'numero_trimestre', 'anio_lectivo', name='uq_trimestre_curso_numero_anio')
    )
    op.create_index(op.f('ix_trimestres_id_trimestre'), 'trimestres', ['id_trimestre'], unique=False)
    
    # Actualizar tabla insumos
    op.add_column('insumos', sa.Column('id_trimestre', sa.Integer(), nullable=False))
    op.add_column('insumos', sa.Column('tipo_insumo', sa.Enum('actividad', 'proyecto_trimestral', 'examen_trimestral', name='tipoinsumoenum'), nullable=False))
    op.create_unique_constraint('uq_proyecto_examen_por_trimestre', 'insumos', ['id_cmd', 'id_trimestre', 'tipo_insumo'])
    op.create_foreign_key(None, 'insumos', 'trimestres', ['id_trimestre'], ['id_trimestre'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    # Remover cambios en tabla insumos
    op.drop_constraint(None, 'insumos', type_='foreignkey')
    op.drop_constraint('uq_proyecto_examen_por_trimestre', 'insumos', type_='unique')
    op.drop_column('insumos', 'tipo_insumo')
    op.drop_column('insumos', 'id_trimestre')
    
    # Remover tabla trimestres
    op.drop_index(op.f('ix_trimestres_id_trimestre'), table_name='trimestres')
    op.drop_table('trimestres')
