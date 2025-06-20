"""add_podcast_jobs_table

Revision ID: 23539da85f87
Revises: 3a51617df8e0
Create Date: 2025-06-18 17:46:12.026049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23539da85f87'
down_revision: Union[str, Sequence[str], None] = '3a51617df8e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('podcast_jobs',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('conversation_id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('audio_path', sa.String(length=500), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('total_messages', sa.Integer(), nullable=True),
    sa.Column('processed_messages', sa.Integer(), nullable=True),
    sa.Column('duration_seconds', sa.Float(), nullable=True),
    sa.Column('file_size_bytes', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('podcast_jobs')
    # ### end Alembic commands ###
