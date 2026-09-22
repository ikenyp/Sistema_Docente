"""Agregar instituciones y membresias de contexto

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-09-21 10:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "d9e0f1a2b3c4"
down_revision = "c8d9e0f1a2b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "instituciones",
        sa.Column("id_institucion", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id_institucion"),
        sa.UniqueConstraint("slug"),
    )
    op.add_column("contextos", sa.Column("id_institucion", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_contextos_institucion",
        "contextos",
        "instituciones",
        ["id_institucion"],
        ["id_institucion"],
    )
    op.create_table(
        "usuarios_contextos",
        sa.Column("id_usuario_contexto", sa.Integer(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("id_contexto", sa.Integer(), nullable=False),
        sa.Column("rol", sa.String(length=30), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.ForeignKeyConstraint(["id_contexto"], ["contextos.id_contexto"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuarios.id_usuario"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_usuario_contexto"),
        sa.UniqueConstraint("id_usuario", "id_contexto", name="uq_usuario_contexto"),
    )

    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO instituciones (nombre, slug, activo)
        VALUES ('Institución de prueba', 'institucion-prueba', true)
        ON CONFLICT (slug) DO NOTHING
    """))
    conn.execute(sa.text("""
        UPDATE contextos
        SET id_institucion = (
            SELECT id_institucion FROM instituciones WHERE slug = 'institucion-prueba'
        )
        WHERE tipo_modo = 'institucional' AND id_institucion IS NULL
    """))
    conn.execute(sa.text("""
        INSERT INTO usuarios_contextos (id_usuario, id_contexto, rol, activo)
        SELECT u.id_usuario, c.id_contexto, u.rol::text, true
        FROM usuarios u
        CROSS JOIN contextos c
        WHERE c.tipo_modo = 'institucional'
          AND c.activo = true
          AND NOT EXISTS (
              SELECT 1 FROM contextos personal
              WHERE personal.tipo_modo = 'personal'
                AND personal.id_owner_docente = u.id_usuario
                AND personal.activo = true
          )
        ON CONFLICT (id_usuario, id_contexto) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_table("usuarios_contextos")
    op.drop_constraint("fk_contextos_institucion", "contextos", type_="foreignkey")
    op.drop_column("contextos", "id_institucion")
    op.drop_table("instituciones")
