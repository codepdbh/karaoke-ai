"""Allow multiple accounts to share the same bound IP."""

from __future__ import annotations

from alembic import op


revision = "20260307_0005"
down_revision = "20260307_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_users_bound_ip", table_name="users")
    op.create_index("ix_users_bound_ip", "users", ["bound_ip"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_bound_ip", table_name="users")
    op.create_index("ix_users_bound_ip", "users", ["bound_ip"], unique=True)
