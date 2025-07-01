"""update_default_credits_to_10000

Revision ID: a786426adfc4
Revises: fd531aae229f
Create Date: 2025-06-29 16:01:23.952468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a786426adfc4'
down_revision: Union[str, Sequence[str], None] = 'fd531aae229f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Update existing users with 100 credits to have 10,000 credits ($100 worth)
    op.execute("UPDATE users SET credits_balance = 10000 WHERE credits_balance = 100")


def downgrade() -> None:
    """Downgrade schema."""
    # Revert users with 10,000 credits back to 100
    op.execute("UPDATE users SET credits_balance = 100 WHERE credits_balance = 10000")
