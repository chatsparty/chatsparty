"""add_projects_and_project_files_tables

Revision ID: 81b321a41741
Revises: 946675892296
Create Date: 2025-01-27 20:32:35.936698

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '81b321a41741'
down_revision: Union[str, Sequence[str], None] = '946675892296'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # E2B VM Integration
        sa.Column('e2b_sandbox_id', sa.String(length=255), nullable=True),
        sa.Column('e2b_template_id', sa.String(length=255), nullable=True),
        sa.Column('vm_status', sa.String(length=50),
                  nullable=False, server_default='inactive'),
        sa.Column('vm_config', sa.JSON(), nullable=True),
        sa.Column('vm_url', sa.String(length=500), nullable=True),

        # Storage & Files
        sa.Column('storage_mount_path', sa.String(length=500), nullable=True),
        sa.Column('storage_config', sa.JSON(), nullable=True),

        # Project settings
        sa.Column('is_active', sa.Boolean(),
                  nullable=False, server_default='true'),
        sa.Column('auto_sync_files', sa.Boolean(),
                  nullable=False, server_default='true'),

        # User relationship
        sa.Column('user_id', sa.String(), nullable=False),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('last_vm_activity', sa.DateTime(
            timezone=True), nullable=True),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )
    op.create_index(op.f('ix_projects_user_id'),
                    'projects', ['user_id'], unique=False)
    op.create_index(op.f('ix_projects_vm_status'),
                    'projects', ['vm_status'], unique=False)

    # Create project_files table
    op.create_table(
        'project_files',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('vm_path', sa.String(length=500), nullable=True),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('checksum', sa.String(length=64), nullable=True),

        # File metadata
        sa.Column('is_synced_to_vm', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_modified_in_vm', sa.DateTime(
            timezone=True), nullable=True),

        # File permissions and access
        sa.Column('is_executable', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('file_permissions', sa.String(length=10), nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    )
    op.create_index(op.f('ix_project_files_project_id'),
                    'project_files', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_files_filename'),
                    'project_files', ['filename'], unique=False)

    # Create project_vm_services table
    op.create_table(
        'project_vm_services',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('service_name', sa.String(length=100), nullable=False),
        sa.Column('service_type', sa.String(length=50), nullable=False),

        # Service configuration
        sa.Column('port', sa.Integer(), nullable=True),
        sa.Column('command', sa.Text(), nullable=False),
        sa.Column('working_directory', sa.String(length=500), nullable=True),
        sa.Column('environment_vars', sa.JSON(), nullable=True),

        # Service status
        sa.Column('status', sa.String(length=20),
                  nullable=False, server_default='stopped'),
        sa.Column('process_id', sa.Integer(), nullable=True),
        sa.Column('service_url', sa.String(length=500), nullable=True),

        # Service metadata
        sa.Column('auto_start', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('restart_policy', sa.String(length=20),
                  nullable=False, server_default='no'),

        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('last_started_at', sa.DateTime(
            timezone=True), nullable=True),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    )
    op.create_index(op.f('ix_project_vm_services_project_id'),
                    'project_vm_services', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_vm_services_status'),
                    'project_vm_services', ['status'], unique=False)

    # Add project_id column to conversations table using batch mode for SQLite
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('project_id', sa.String(), nullable=True))
        batch_op.create_foreign_key(
            'conversations_project_id_fkey', 'projects', ['project_id'], ['id'])
        batch_op.create_index('ix_conversations_project_id', [
                              'project_id'], unique=False)


def downgrade() -> None:
    # Remove project_id from conversations using batch mode for SQLite
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_index('ix_conversations_project_id')
        batch_op.drop_constraint(
            'conversations_project_id_fkey', type_='foreignkey')
        batch_op.drop_column('project_id')

    # Drop project_vm_services table
    op.drop_index(op.f('ix_project_vm_services_status'),
                  table_name='project_vm_services')
    op.drop_index(op.f('ix_project_vm_services_project_id'),
                  table_name='project_vm_services')
    op.drop_table('project_vm_services')

    # Drop project_files table
    op.drop_index(op.f('ix_project_files_filename'),
                  table_name='project_files')
    op.drop_index(op.f('ix_project_files_project_id'),
                  table_name='project_files')
    op.drop_table('project_files')

    # Drop projects table
    op.drop_index(op.f('ix_projects_vm_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_user_id'), table_name='projects')
    op.drop_table('projects')
