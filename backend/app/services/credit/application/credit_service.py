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
            # Get initial credits from settings or use default
            initial_credits = getattr(settings, 'INITIAL_FREE_CREDITS', 100)
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
        # Get current balance
        balance = await self.get_balance(user_id)
        
        # Check if user has enough credits
        if balance.balance < request.amount:
            raise InsufficientCreditsError(request.amount, balance.balance)
        
        # Calculate new balance
        new_balance = balance.balance - request.amount
        
        # Create transaction record
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
        
        # Update balance and create transaction atomically
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
        # Get current balance
        balance = await self.get_balance(user_id)
        
        # Calculate new balance
        new_balance = balance.balance + amount
        
        # Determine transaction type
        transaction_type = (
            CreditTransactionType.PURCHASE if "purchase" in reason.lower()
            else CreditTransactionType.BONUS if "bonus" in reason.lower()
            else CreditTransactionType.CREDIT
        )
        
        # Create transaction record
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
        
        # Update balance
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
            # Try to get cost from database first
            from ....models.database import ModelCreditCost as ModelCreditCostDB
            from ....core.database import get_sync_db_session
            
            with get_sync_db_session() as db:
                # Check exact match first
                db_cost = db.query(ModelCreditCostDB).filter(
                    ModelCreditCostDB.provider == provider,
                    ModelCreditCostDB.model_name == model_name,
                    ModelCreditCostDB.is_active == True
                ).first()
                
                if db_cost:
                    return ModelCreditCost(
                        provider=db_cost.provider,
                        model_name=db_cost.model_name,
                        cost_per_message=db_cost.cost_per_message,
                        cost_per_1k_tokens=db_cost.cost_per_1k_tokens,
                        is_default_model=db_cost.is_default_model
                    )
                
                # Check for wildcard match
                db_cost = db.query(ModelCreditCostDB).filter(
                    ModelCreditCostDB.provider == provider,
                    ModelCreditCostDB.model_name == "*",
                    ModelCreditCostDB.is_active == True
                ).first()
                
                if db_cost:
                    return ModelCreditCost(
                        provider=provider,
                        model_name=model_name,
                        cost_per_message=db_cost.cost_per_message,
                        cost_per_1k_tokens=db_cost.cost_per_1k_tokens
                    )
        
        except Exception:
            # Fall back to defaults if database lookup fails
            pass
        
        # Default costs for known providers
        if provider == "ollama":
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=0  # Free for local models
            )
        elif provider == "chatsparty":
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=1,
                is_default_model=True
            )
        else:
            # Default cost for unknown models
            default_cost = getattr(settings, 'DEFAULT_CREDIT_COST_PER_MESSAGE', 2)
            return ModelCreditCost(
                provider=provider,
                model_name=model_name,
                cost_per_message=default_cost
            )
    
    async def calculate_conversation_cost(
        self,
        agent_count: int,
        max_turns: int,
        provider: str = "chatsparty",
        model_name: str = "gemini-2.5-flash"
    ) -> int:
        """Calculate estimated cost for a multi-agent conversation"""
        model_cost = await self.get_model_cost(provider, model_name)
        
        # Formula: (number of agents * max turns * cost per message)
        # Add 20% buffer for system messages
        base_cost = agent_count * max_turns * model_cost.cost_per_message
        return int(base_cost * 1.2)