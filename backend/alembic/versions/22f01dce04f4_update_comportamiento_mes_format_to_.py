"""update_comportamiento_mes_format_to_yyyy_mm

Revision ID: 22f01dce04f4
Revises: 96de0f3269c9
Create Date: 2026-01-22 02:23:15.239459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '22f01dce04f4'
down_revision: Union[str, Sequence[str], None] = '96de0f3269c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Actualizar registros existentes: convertir nombres de mes a formato YYYY-MM
    # Asumimos año 2026 para registros existentes
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE comportamiento
            SET mes = CASE 
                WHEN mes = 'enero' THEN '2026-01'
                WHEN mes = 'febrero' THEN '2026-02'
                WHEN mes = 'marzo' THEN '2026-03'
                WHEN mes = 'abril' THEN '2026-04'
                WHEN mes = 'mayo' THEN '2026-05'
                WHEN mes = 'junio' THEN '2026-06'
                WHEN mes = 'julio' THEN '2026-07'
                WHEN mes = 'agosto' THEN '2026-08'
                WHEN mes = 'septiembre' THEN '2026-09'
                WHEN mes = 'octubre' THEN '2026-10'
                WHEN mes = 'noviembre' THEN '2026-11'
                WHEN mes = 'diciembre' THEN '2026-12'
                ELSE mes
            END
            WHERE mes IN ('enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre');
            """
        )
    )
    
    # Modificar la longitud de la columna
    op.alter_column('comportamiento', 'mes',
                    existing_type=sa.String(length=10),
                    type_=sa.String(length=7),
                    existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Revertir: convertir YYYY-MM a nombres de mes
    conn = op.get_bind()
    conn.execute(
        text(
            """
            UPDATE comportamiento
            SET mes = CASE 
                WHEN mes LIKE '%-01' THEN 'enero'
                WHEN mes LIKE '%-02' THEN 'febrero'
                WHEN mes LIKE '%-03' THEN 'marzo'
                WHEN mes LIKE '%-04' THEN 'abril'
                WHEN mes LIKE '%-05' THEN 'mayo'
                WHEN mes LIKE '%-06' THEN 'junio'
                WHEN mes LIKE '%-07' THEN 'julio'
                WHEN mes LIKE '%-08' THEN 'agosto'
                WHEN mes LIKE '%-09' THEN 'septiembre'
                WHEN mes LIKE '%-10' THEN 'octubre'
                WHEN mes LIKE '%-11' THEN 'noviembre'
                WHEN mes LIKE '%-12' THEN 'diciembre'
                ELSE mes
            END
            WHERE mes ~ '^[0-9]{4}-[0-9]{2}$';
            """
        )
    )
    
    # Revertir longitud de columna
    op.alter_column('comportamiento', 'mes',
                    existing_type=sa.String(length=7),
                    type_=sa.String(length=10),
                    existing_nullable=False)
