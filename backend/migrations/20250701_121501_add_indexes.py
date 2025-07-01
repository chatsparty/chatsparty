"""
Add database indexes for performance
"""

from yoyo import step

__depends__ = {'20250701_120952_initial_migration'}

steps = [
    step("CREATE INDEX ix_users_email ON users (email)"),
    step("CREATE INDEX ix_credit_transactions_user_id ON credit_transactions (user_id)"),
    step("CREATE INDEX ix_credit_transactions_created_at ON credit_transactions (created_at)"),
]