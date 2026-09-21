"""Agregar tabla de trimestres y actualizar insumos

Revision ID: 5bc5e2e90f28
Revises: f22e5b4b1507
Create Date: 2026-01-06 04:44:02.229829

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# Identificadores de revision utilizados por Alembic.
revision: str = "5bc5e2e90f28"
down_revision: Union[str, Sequence[str], None] = "f22e5b4b1507"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ensure_tipo_insumo_enum(conn):
    """Crear o renombrar el enum utilizado por insumos."""
    conn.execute(
        text(
            """
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoinsmoenum')
                   AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoinsumoenum') THEN
                    EXECUTE 'ALTER TYPE tipoinsmoenum RENAME TO tipoinsumoenum';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoinsumoenum') THEN
                    CREATE TYPE tipoinsumoenum AS ENUM ('actividad','proyecto_trimestral','examen_trimestral');
                END IF;
            END$$;
            """
        )
    )


def _create_trimestres_table(inspector):
    """Crear la tabla de trimestres si no existe."""
    if inspector.has_table("trimestres"):
        return

    op.create_table(
        "trimestres",
        sa.Column("id_trimestre", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("id_curso", sa.Integer(), nullable=False),
        sa.Column("numero_trimestre", sa.Integer(), nullable=False),
        sa.Column("anio_lectivo", sa.String(length=20), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["id_curso"], ["cursos.id_curso"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "id_curso",
            "numero_trimestre",
            "anio_lectivo",
            name="uq_trimestre_curso_numero_anio",
        ),
    )
    op.create_index(op.f("ix_trimestres_id_trimestre"), "trimestres", ["id_trimestre"], unique=False)


def _backfill_trimestres(conn):
    """Garantizar los trimestres base (1-3) de cada curso."""
    conn.execute(
        text(
            """
            INSERT INTO trimestres (id_curso, numero_trimestre, anio_lectivo, fecha_inicio, fecha_fin)
            SELECT c.id_curso, t.num, c.anio_lectivo, CURRENT_DATE, CURRENT_DATE
            FROM cursos c
            CROSS JOIN (VALUES (1),(2),(3)) AS t(num)
            ON CONFLICT ON CONSTRAINT uq_trimestre_curso_numero_anio DO NOTHING;
            """
        )
    )


def _ensure_insumos_columns(inspector, conn):
    """Agregar columnas faltantes a insumos y configurar restricciones."""
    existing_cols = {col["name"] for col in inspector.get_columns("insumos")}

    if "id_trimestre" not in existing_cols:
        op.add_column("insumos", sa.Column("id_trimestre", sa.Integer(), nullable=True))

    if "tipo_insumo" not in existing_cols:
        op.add_column(
            "insumos",
            sa.Column(
                "tipo_insumo",
                sa.Enum("actividad", "proyecto_trimestral", "examen_trimestral", name="tipoinsumoenum"),
                nullable=True,
            ),
        )

    # Mover datos existentes al nuevo esquema
    conn.execute(
        text(
            """
            UPDATE insumos i
            SET
                tipo_insumo = COALESCE(i.tipo_insumo, 'actividad')
            WHERE i.tipo_insumo IS NULL;
            """
        )
    )

    conn.execute(
        text(
            """
            UPDATE insumos i
            SET id_trimestre = t.id_trimestre
            FROM cursos_materias_docentes cmd
            JOIN trimestres t ON t.id_curso = cmd.id_curso AND t.numero_trimestre = 1
            WHERE i.id_cmd = cmd.id_cmd AND (i.id_trimestre IS NULL OR i.id_trimestre = 0);
            """
        )
    )

    # Eliminar la restriccion anterior si existe
    try:
        op.drop_constraint("uq_proyecto_examen_por_trimestre", "insumos", type_="unique")
    except Exception:
        pass

    # Asegurar la llave foranea y la restriccion unica
    try:
        op.create_foreign_key(
            "fk_insumos_trimestres", "insumos", "trimestres", ["id_trimestre"], ["id_trimestre"], ondelete="CASCADE"
        )
    except Exception:
        # Si ya existe, la ignoramos
        pass

    try:
        op.create_unique_constraint(
            "uq_proyecto_examen_por_trimestre", "insumos", ["id_cmd", "id_trimestre", "tipo_insumo"]
        )
    except Exception:
        pass


def upgrade() -> None:
    """Aplicar cambios al esquema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    _ensure_tipo_insumo_enum(conn)
    _create_trimestres_table(inspector)
    _backfill_trimestres(conn)
    _ensure_insumos_columns(inspector, conn)


def downgrade() -> None:
    """Revertir cambios del esquema."""
    try:
        op.drop_constraint("fk_insumos_trimestres", "insumos", type_="foreignkey")
    except Exception:
        pass

    try:
        op.drop_constraint("uq_proyecto_examen_por_trimestre", "insumos", type_="unique")
    except Exception:
        pass

    with op.batch_alter_table("insumos") as batch_op:
        try:
            batch_op.drop_column("tipo_insumo")
        except Exception:
            pass
        try:
            batch_op.drop_column("id_trimestre")
        except Exception:
            pass

    try:
        op.drop_index(op.f("ix_trimestres_id_trimestre"), table_name="trimestres")
    except Exception:
        pass

    if op.get_bind().dialect.has_table(op.get_bind(), "trimestres"):
        op.drop_table("trimestres")
