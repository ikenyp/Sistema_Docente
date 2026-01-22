"""update_estado_asistencia_enum_add_justificado_atraso

Revision ID: 96de0f3269c9
Revises: e731e43734b9
Create Date: 2026-01-22 01:47:51.997553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '96de0f3269c9'
down_revision: Union[str, Sequence[str], None] = 'e731e43734b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Actualizar el enum para agregar 'justificado' y 'atraso'
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DO $$
            BEGIN
                -- Crear nuevo tipo enum con los nuevos valores
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_asistencia_new') THEN
                    CREATE TYPE estado_asistencia_new AS ENUM ('presente', 'ausente', 'justificado', 'atraso');
                END IF;
                
                -- Cambiar la columna al nuevo tipo
                ALTER TABLE asistencia ALTER COLUMN estado TYPE estado_asistencia_new USING estado::text::estado_asistencia_new;
                
                -- Eliminar el tipo viejo
                DROP TYPE IF EXISTS estado_asistencia CASCADE;
                
                -- Renombrar el nuevo tipo al nombre original
                ALTER TYPE estado_asistencia_new RENAME TO estado_asistencia;
            END$$;
            """
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Revertir el enum a los valores originales
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DO $$
            BEGIN
                -- Crear tipo enum antiguo
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_asistencia_old') THEN
                    CREATE TYPE estado_asistencia_old AS ENUM ('presente', 'ausente', 'atraso');
                END IF;
                
                -- Cambiar la columna al tipo antiguo
                ALTER TABLE asistencia ALTER COLUMN estado TYPE estado_asistencia_old USING estado::text::estado_asistencia_old;
                
                -- Eliminar el tipo nuevo
                DROP TYPE IF EXISTS estado_asistencia CASCADE;
                
                -- Renombrar el tipo antiguo al nombre original
                ALTER TYPE estado_asistencia_old RENAME TO estado_asistencia;
            END$$;
            """
        )
    )
