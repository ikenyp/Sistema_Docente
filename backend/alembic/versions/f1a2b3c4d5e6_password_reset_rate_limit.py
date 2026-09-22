"""Agregar control persistente de solicitudes de recuperación

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
"""

from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e0f1a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_requests",
        sa.Column("id_request", sa.Integer(), nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id_request"),
    )
    op.create_index("ix_password_reset_requests_email_created", "password_reset_requests", ["email_hash", "created_at"])
    op.create_index("ix_password_reset_requests_ip_created", "password_reset_requests", ["ip_address", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_password_reset_requests_ip_created", table_name="password_reset_requests")
    op.drop_index("ix_password_reset_requests_email_created", table_name="password_reset_requests")
    op.drop_table("password_reset_requests")
