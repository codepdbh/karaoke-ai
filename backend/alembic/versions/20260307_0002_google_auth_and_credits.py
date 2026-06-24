"""Add google auth provider and user credits."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260307_0002"
down_revision = "20260304_0001"
branch_labels = None
depends_on = None


auth_provider = postgresql.ENUM("google", "local", name="auth_provider", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    auth_provider.create(bind, checkfirst=True)

    op.add_column(
        "users",
        sa.Column("auth_provider", auth_provider, nullable=False, server_default="google"),
    )
    op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("credits_remaining", sa.Integer(), nullable=False, server_default="2"),
    )
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)

    op.execute("UPDATE users SET auth_provider = 'local' WHERE role = 'admin'")
    op.execute("UPDATE users SET credits_remaining = 2")

    op.alter_column("users", "auth_provider", server_default=None)
    op.alter_column("users", "credits_remaining", server_default=None)


def downgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "credits_remaining")
    op.drop_column("users", "google_sub")
    op.drop_column("users", "auth_provider")
    auth_provider.drop(op.get_bind(), checkfirst=True)
