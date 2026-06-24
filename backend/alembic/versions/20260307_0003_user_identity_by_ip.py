"""Add user profile fields and IP binding."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260307_0003"
down_revision = "20260307_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("bound_ip", sa.String(length=64), nullable=True))
    op.create_index("ix_users_bound_ip", "users", ["bound_ip"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_bound_ip", table_name="users")
    op.drop_column("users", "bound_ip")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
