from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import select, col, desc
from sqlmodel.ext.asyncio.session import AsyncSession
import logging

logger = logging.getLogger(__name__)

from ....models.credit import CreditBalance, CreditTransaction, CreditPlan
from ....models.database import User, CreditTransaction as CreditTransactionModel
from ..domain.interfaces import CreditRepositoryInterface


class CreditRepository(CreditRepositoryInterface):
    """SQLAlchemy implementation of credit repository"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def get_user_balance(self, user_id: str) -> Optional[CreditBalance]:
        """Get user's current credit balance"""
        stmt = select(User).where(User.id == user_id)
        result = await self.db_session.exec(stmt)
        user = result.first()
        if not user:
            return None
            
        return CreditBalance(
            user_id=user_id,
            balance=user.credits_balance,
            lifetime_credits_used=user.credits_used,
            lifetime_credits_purchased=user.credits_purchased,
            credit_plan=CreditPlan(user.credit_plan) if user.credit_plan else CreditPlan.FREE,
            last_refill_at=user.last_credit_refill_at or datetime.now(timezone.utc)
        )
    
    async def update_user_balance(
        self, 
        user_id: str, 
        new_balance: int,
        credits_used_delta: int = 0,
        credits_purchased_delta: int = 0
    ) -> bool:
        """Update user's credit balance"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db_session.exec(stmt)
            user = result.first()
            if not user:
                return False
            
            user.credits_balance = new_balance
            user.credits_used += credits_used_delta
            user.credits_purchased += credits_purchased_delta
            
            # Let FastAPI handle commit/rollback
            return True
        except Exception as e:
            logger.error(f"Error updating user balance: {e}")
            raise
    
    async def create_transaction(self, transaction: CreditTransaction) -> CreditTransaction:
        """Create a new credit transaction record"""
        try:
            db_transaction = CreditTransactionModel(
                id=transaction.id,
                user_id=transaction.user_id,
                amount=transaction.amount,
                transaction_type=transaction.transaction_type.value,
                reason=transaction.reason,
                description=transaction.description,
                transaction_metadata=transaction.metadata,
                balance_after=transaction.balance_after
            )
            
            self.db_session.add(db_transaction)
            # Let FastAPI handle commit/rollback
            return transaction
        except Exception as e:
            logger.error(f"Error creating transaction: {e}")
            raise
    
    async def get_transactions(
        self, 
        user_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[CreditTransaction]:
        """Get user's credit transaction history"""
        try:
            stmt = select(CreditTransactionModel)\
                .where(CreditTransactionModel.user_id == user_id)\
                .order_by(desc(CreditTransactionModel.created_at))\
                .offset(offset)\
                .limit(limit)
            result = await self.db_session.exec(stmt)
            db_transactions = result.all()
            
            transactions = []
            for db_tx in db_transactions:
                from ..domain.entities import CreditTransactionType, CreditConsumptionReason
                transactions.append(CreditTransaction(
                    id=db_tx.id,
                    user_id=db_tx.user_id,
                    amount=db_tx.amount,
                    transaction_type=CreditTransactionType(db_tx.transaction_type),
                    reason=CreditConsumptionReason(db_tx.reason),
                    description=db_tx.description,
                    metadata=db_tx.transaction_metadata,
                    balance_after=db_tx.balance_after,
                    created_at=db_tx.created_at
                ))
            
            return transactions
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            return []