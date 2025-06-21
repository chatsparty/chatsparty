"""Add sample voice connections for testing

Revision ID: 3a51617df8e0
Revises: 8958bc9e02d2
Create Date: 2025-06-18 16:29:53.081569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a51617df8e0'
down_revision: Union[str, Sequence[str], None] = '8958bc9e02d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add sample voice connections for testing."""
    # Removed default voice connections creation
    # Users should create their own voice connections with proper API keys
    pass


def downgrade() -> None:
    """Remove sample voice connections."""
    connection = op.get_bind()
    # Clean up any default voice connections that may have been created
    connection.execute(sa.text("DELETE FROM voice_connections WHERE id IN ('1', '2', '3')"))
