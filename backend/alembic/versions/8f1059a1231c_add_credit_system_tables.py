"""add_credit_system_tables

Revision ID: 8f1059a1231c
Revises: 5afcb91c1d73
Create Date: 2025-06-29 07:53:47.956590

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f1059a1231c'
down_revision: Union[str, Sequence[str], None] = '5afcb91c1d73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add credit fields to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('credits_balance', sa.Integer(), nullable=False, server_default='100'))
        batch_op.add_column(sa.Column('credits_used', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('credits_purchased', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('credit_plan', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('last_credit_refill_at', sa.DateTime(), nullable=True))
    
    # Create credit_transactions table
    op.create_table('credit_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create model_credit_costs table for configurable costs
    op.create_table('model_credit_costs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('provider', sa.String(100), nullable=False),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('cost_per_message', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('cost_per_1k_tokens', sa.Integer(), nullable=True),
        sa.Column('is_default_model', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', 'model_name')
    )
    
    # Add indexes for performance
    with op.batch_alter_table('credit_transactions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_credit_transactions_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_credit_transactions_created_at'), ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    with op.batch_alter_table('credit_transactions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_credit_transactions_created_at'))
        batch_op.drop_index(batch_op.f('ix_credit_transactions_user_id'))
    
    # Drop tables
    op.drop_table('model_credit_costs')
    op.drop_table('credit_transactions')
    
    # Remove columns from users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('last_credit_refill_at')
        batch_op.drop_column('credit_plan')
        batch_op.drop_column('credits_purchased')
        batch_op.drop_column('credits_used')
        batch_op.drop_column('credits_balance')
