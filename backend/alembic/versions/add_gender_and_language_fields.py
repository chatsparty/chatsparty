"""Add gender field to Agent and language field to Message

Revision ID: add_gender_and_language
Revises: a786426adfc4
Create Date: 2025-07-01 03:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_gender_and_language'
down_revision: Union[str, Sequence[str], None] = 'a786426adfc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add gender to agents and language to messages."""
    # Add gender column to agents table
    with op.batch_alter_table('agents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gender', sa.String(20), nullable=False, server_default='neutral'))
    
    # Add language column to messages table
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('language', sa.String(10), nullable=True))


def downgrade() -> None:
    """Remove gender from agents and language from messages."""
    # Remove language column from messages table
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_column('language')
    
    # Remove gender column from agents table
    with op.batch_alter_table('agents', schema=None) as batch_op:
        batch_op.drop_column('gender')