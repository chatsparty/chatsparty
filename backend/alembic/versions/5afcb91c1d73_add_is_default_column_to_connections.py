"""add_is_default_column_to_connections

Revision ID: 5afcb91c1d73
Revises: add_project_instructions
Create Date: 2025-06-29 07:44:27.787184

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5afcb91c1d73'
down_revision: Union[str, Sequence[str], None] = 'add_project_instructions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_default column to connections table
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove is_default column from connections table
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.drop_column('is_default')
