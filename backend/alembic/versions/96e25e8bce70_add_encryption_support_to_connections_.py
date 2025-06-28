"""Add encryption support to connections table

Revision ID: 96e25e8bce70
Revises: 845b3fc1d3f7
Create Date: 2025-06-18 12:18:19.163210

"""
import os
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import column, table

# revision identifiers, used by Alembic.
revision: str = '96e25e8bce70'
down_revision: Union[str, Sequence[str], None] = '845b3fc1d3f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and encrypt existing API keys."""
    # First, alter the table structure using batch operations for SQLite compatibility
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.alter_column(
            'api_key',
            existing_type=sa.VARCHAR(length=500),
            type_=sa.String(length=1000),
            existing_nullable=True
        )

        # Add the encryption flag column with default False for existing records
        batch_op.add_column(
            sa.Column(
                'api_key_encrypted',
                sa.Boolean(),
                nullable=False,
                server_default=sa.false()
            )
        )

    # Encrypt existing API keys
    connection = op.get_bind()

    # Check if encryption master key is available
    if os.getenv("ENCRYPTION_MASTER_KEY"):
        # Import crypto service here to avoid import issues during migration
        try:
            from app.services.crypto_service import crypto_service

            # Define the connections table for data migration
            connections_table = table('connections',
                                      column('id', sa.String),
                                      column('api_key', sa.String),
                                      column('api_key_encrypted', sa.Boolean)
                                      )

            # Get all connections with API keys
            result = connection.execute(
                sa.select(connections_table.c.id, connections_table.c.api_key)
                .where(connections_table.c.api_key.isnot(None))
                .where(connections_table.c.api_key != '')
            )

            # Encrypt each API key
            for row in result:
                if row.api_key:
                    try:
                        encrypted_key = crypto_service.encrypt(row.api_key)
                        connection.execute(
                            connections_table.update()
                            .where(connections_table.c.id == row.id)
                            .values(api_key=encrypted_key, api_key_encrypted=True)
                        )
                    except Exception as e:
                        print(
                            f"Warning: Could not encrypt API key for connection {row.id}: {e}")
                        # Leave the key unencrypted and mark as such
                        connection.execute(
                            connections_table.update()
                            .where(connections_table.c.id == row.id)
                            .values(api_key_encrypted=False)
                        )
        except ImportError as e:
            print(
                f"Warning: Could not import crypto service during migration: {e}")
            print("Existing API keys will remain unencrypted. Run migration again after setting ENCRYPTION_MASTER_KEY.")
    else:
        print("Warning: ENCRYPTION_MASTER_KEY not set. Existing API keys will remain unencrypted.")
        print("Set ENCRYPTION_MASTER_KEY and run migration again to encrypt existing keys.")

    # Remove the server default after data migration using batch operations
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.alter_column('api_key_encrypted', server_default=None)


def downgrade() -> None:
    """Downgrade schema and decrypt API keys."""
    # Decrypt existing API keys if possible
    connection = op.get_bind()

    if os.getenv("ENCRYPTION_MASTER_KEY"):
        try:
            from app.services.crypto_service import crypto_service

            # Define the connections table for data migration
            connections_table = table('connections',
                                      column('id', sa.String),
                                      column('api_key', sa.String),
                                      column('api_key_encrypted', sa.Boolean)
                                      )

            # Get all encrypted connections
            result = connection.execute(
                sa.select(connections_table.c.id, connections_table.c.api_key)
                .where(connections_table.c.api_key_encrypted.is_(True))
                .where(connections_table.c.api_key.isnot(None))
            )

            # Decrypt each API key
            for row in result:
                if row.api_key:
                    try:
                        decrypted_key = crypto_service.decrypt(row.api_key)
                        connection.execute(
                            connections_table.update()
                            .where(connections_table.c.id == row.id)
                            .values(api_key=decrypted_key)
                        )
                    except Exception as e:
                        print(
                            f"Warning: Could not decrypt API key for connection {row.id}: {e}")
        except ImportError as e:
            print(
                f"Warning: Could not import crypto service during downgrade: {e}")

    # Remove the encryption column and resize the api_key column using batch operations
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.drop_column('api_key_encrypted')
        batch_op.alter_column(
            'api_key',
            existing_type=sa.String(length=1000),
            type_=sa.VARCHAR(length=500),
            existing_nullable=True
        )
