import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException

from ....core.config import settings
from ....models.credit import (
    CreditBalance,
    CreditConsumptionReason,
    CreditConsumptionRequest,
    CreditPlan,
    CreditTransaction,
    CreditTransactionType,
    ModelCreditCost,
)
from ..domain.interfaces import CreditRepositoryInterface, CreditServiceInterface


class InsufficientCreditsError(HTTPException):
    def __init__(self, required: int, available: int):
        super().__init__(
            status_code=402,
            detail=f"Insufficient credits. Required: {required}, Available: {available}"
        )


class CreditService(CreditServiceInterface):
    """Service for managing user credits"""
    
    def __init__(self, repository: CreditRepositoryInterface):
        self.repository = repository
    
    async def get_balance(self, user_id: str) -> CreditBalance:
        """Get user's current credit balance"""
        balance = await self.repository.get_user_balance(user_id)
        
        if not balance:
            initial_credits = getattr(settings, 'INITIAL_FREE_CREDITS', 10000)
            balance = CreditBalance(
                user_id=user_id,
                balance=initial_credits,
                lifetime_credits_used=0,
                lifetime_credits_purchased=0,
                credit_plan=CreditPlan.FREE,
                last_refill_at=datetime.now(timezone.utc)
            )
            await self.repository.update_user_balance(
                user_id=user_id,
                new_balance=balance.balance
            )
        
        return balance
    
    async def check_credits(self, user_id: str, required_credits: int) -> bool:
        """Check if user has sufficient credits"""
        balance = await self.get_balance(user_id)
        return balance.balance >= required_credits
    
    async def consume_credits(
        self,
        user_id: str,
        request: CreditConsumptionRequest
    ) -> CreditTransaction:
        """Consume credits from user's balance"""
        balance = await self.get_balance(user_id)
        
        if balance.balance < request.amount:
            raise InsufficientCreditsError(request.amount, balance.balance)
        
        new_balance = balance.balance - request.amount
        
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=request.amount,
            transaction_type=CreditTransactionType.DEBIT,
            reason=request.reason.value,
            description=request.description,
            metadata=request.metadata,
            balance_after=new_balance,
            created_at=datetime.now(timezone.utc)
        )
        
        await self.repository.update_user_balance(
            user_id=user_id,
            new_balance=new_balance,
            credits_used_delta=request.amount
        )
        await self.repository.create_transaction(transaction)
        
        return transaction
    
    async def add_credits(
        self,
        user_id: str,
        amount: int,
        reason: str,
        description: Optional[str] = None
    ) -> CreditTransaction:
        """Add credits to user's balance"""
        balance = await self.get_balance(user_id)
        
        new_balance = balance.balance + amount
        
        transaction_type = (
            CreditTransactionType.PURCHASE if "purchase" in reason.lower()
            else CreditTransactionType.BONUS if "bonus" in reason.lower()
            else CreditTransactionType.CREDIT
        )
        
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            transaction_type=transaction_type,
            reason=reason,
            description=description,
            balance_after=new_balance,
            created_at=datetime.now(timezone.utc)
        )
        
        credits_purchased_delta = amount if transaction_type == CreditTransactionType.PURCHASE else 0
        await self.repository.update_user_balance(
            user_id=user_id,
            new_balance=new_balance,
            credits_purchased_delta=credits_purchased_delta
        )
        await self.repository.create_transaction(transaction)
        
        return transaction
    
    async def get_transaction_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[CreditTransaction]:
        """Get user's credit transaction history"""
        return await self.repository.get_transactions(user_id, limit, offset)
    
    async def get_model_cost(
        self,
        provider: str,
        model_name: str
    ) -> ModelCreditCost:
        """Get the credit cost for a specific model from database or defaults"""
        try:
            from ....models.database import ModelCreditCost as ModelCreditCostDB
            from ....core.database import db_manager
            from sqlmodel import select
            
            async with db_manager.get_session() as db:
                stmt = select(ModelCreditCostDB).where(
                    ModelCreditCostDB.provider == provider,
                    ModelCreditCostDB.model_name == model_name,
                    ModelCreditCostDB.is_active == True
                )
                result = await db.exec(stmt)
                db_cost = result.first()
                
                if db_cost:
                    return ModelCreditCost(
                        provider=db_cost.provider,
                        model_name=db_cost.model_name,
                        cost_per_message=db_cost.cost_per_message,
                        cost_per_1k_tokens=db_cost.cost_per_1k_tokens,
                        is_default_model=db_cost.is_default_model
                    )
                
                stmt = select(ModelCreditCostDB).where(
                    ModelCreditCostDB.provider == provider,
                    ModelCreditCostDB.model_name == "*",
                    ModelCreditCostDB.is_active == True
                )
                result = await db.exec(stmt)
                db_cost = result.first()
                
                if db_cost:
                    return ModelCreditCost(
                        provider=provider,
                        model_name=model_name,
                        cost_per_message=db_cost.cost_per_message,
                        cost_per_1k_tokens=db_cost.cost_per_1k_tokens
                    )
        
        except Exception:
            pass
        
        if provider == "ollama":
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=0
            )
        elif provider == "chatsparty":
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=1,
                is_default_model=True
            )
        else:
            default_cost = getattr(settings, 'DEFAULT_CREDIT_COST_PER_MESSAGE', 2)
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=default_cost
            )
    
