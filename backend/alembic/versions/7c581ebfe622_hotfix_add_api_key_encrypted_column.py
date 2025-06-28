"""hotfix add api_key_encrypted column

Revision ID: 7c581ebfe622
Revises: 96e25e8bce70
Create Date: 2025-06-18 13:27:01.743836

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7c581ebfe622'
down_revision: Union[str, Sequence[str], None] = '96e25e8bce70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add api_key_encrypted column if it doesn't exist"""
    # Check if column exists before adding
    connection = op.get_bind()

    # Use database-agnostic way to check column existence
    try:
        # Try to select the column - if it exists, this won't raise an error
        connection.execute(
            sa.text("SELECT api_key_encrypted FROM connections LIMIT 1"))
        print("ℹ️  api_key_encrypted column already exists")
    except Exception:
        # Column doesn't exist, add it
        op.add_column('connections', sa.Column('api_key_encrypted',
                      sa.Boolean(), nullable=False, server_default=sa.false()))
        print("✅ Added api_key_encrypted column")


def downgrade() -> None:
    """Remove api_key_encrypted column"""
    # Check if column exists before dropping
    connection = op.get_bind()

    try:
        connection.execute(
            sa.text("SELECT api_key_encrypted FROM connections LIMIT 1"))
        op.drop_column('connections', 'api_key_encrypted')
        print("✅ Removed api_key_encrypted column")
    except Exception:
        print("ℹ️  api_key_encrypted column doesn't exist")
