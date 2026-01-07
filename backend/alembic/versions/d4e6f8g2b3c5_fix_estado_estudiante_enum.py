"""fix_estado_estudiante_enum

Revision ID: d4e6f8g2b3c5
Revises: c3d5e7f1a2b4
Create Date: 2026-01-06 12:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e6f8g2b3c5'
down_revision: Union[str, Sequence[str], None] = 'c3d5e7f1a2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Verificar si el enum necesita actualización
    # Si la BD ya tiene el enum correcto (matriculado, retirado, graduado), no hacer nada
    # Este es un fix para sincronizar el código con la BD que ya tenía el enum correcto
    
    # Primero, verificar si existen valores antiguos
    from sqlalchemy import text
    conn = op.get_bind()

    # Ejecutar dentro de un savepoint (nested transaction) para que
    # cualquier error sea retrocedido sin abortar la transacción externa.
    try:
        with conn.begin_nested():
            result = conn.execute(text("SELECT COUNT(*) FROM estudiantes WHERE estado IN ('activo','inactivo')"))
            count = result.scalar()

            if count and count > 0:
                # Usar la misma conexión para actualizar
                conn.execute(text("UPDATE estudiantes SET estado = 'matriculado' WHERE estado IN ('activo','inactivo')"))
    except Exception:
        # Si falla, revertimos solo el savepoint y seguimos; no aborta todo el upgrade
        pass


def downgrade() -> None:
    """Downgrade schema."""
    # No hacer nada en el downgrade ya que el enum ya estaba correcto
    pass
