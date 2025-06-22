"""remove_e2b_add_docker_container

Revision ID: ec969bd67c78
Revises: 141ad96aa492
Create Date: 2025-06-22 04:42:29.052185

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec969bd67c78'
down_revision: Union[str, Sequence[str], None] = '141ad96aa492'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove E2B columns and add Docker container ID column."""
    # Drop E2B specific columns
    op.drop_column('projects', 'e2b_sandbox_id')
    op.drop_column('projects', 'e2b_template_id')
    
    # Add Docker container ID column
    op.add_column('projects', sa.Column('vm_container_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Add back E2B columns and remove Docker container ID column."""
    # Remove Docker container ID column
    op.drop_column('projects', 'vm_container_id')
    
    # Add back E2B specific columns
    op.add_column('projects', sa.Column('e2b_sandbox_id', sa.String(length=255), nullable=True))
    op.add_column('projects', sa.Column('e2b_template_id', sa.String(length=255), nullable=True))
