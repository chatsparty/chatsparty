"""Add project instructions field

Revision ID: add_project_instructions
Revises: ec969bd67c78
Create Date: 2024-06-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_project_instructions'
down_revision = 'ec969bd67c78'
branch_labels = None
depends_on = None


def upgrade():
    # Add instructions column to projects table
    with op.batch_alter_table('projects') as batch_op:
        batch_op.add_column(sa.Column('instructions', sa.Text(), nullable=True))


def downgrade():
    # Remove instructions column from projects table
    with op.batch_alter_table('projects') as batch_op:
        batch_op.drop_column('instructions')