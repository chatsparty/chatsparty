from abc import ABC, abstractmethod
from typing import List, Optional

from ....models.credit import (
    CreditBalance,
    CreditConsumptionRequest,
    CreditTransaction,
    ModelCreditCost,
)


class CreditServiceInterface(ABC):
    """Interface for credit management service"""
    
    @abstractmethod
    async def get_balance(self, user_id: str) -> CreditBalance:
        """Get user's current credit balance"""
        pass
    
    @abstractmethod
    async def check_credits(self, user_id: str, required_credits: int) -> bool:
        """Check if user has sufficient credits"""
        pass
    
    @abstractmethod
    async def consume_credits(
        self, 
        user_id: str, 
        request: CreditConsumptionRequest
    ) -> CreditTransaction:
        """Consume credits from user's balance"""
        pass
    
    @abstractmethod
    async def add_credits(
        self,
        user_id: str,
        amount: int,
        reason: str,
        description: Optional[str] = None
    ) -> CreditTransaction:
        """Add credits to user's balance"""
        pass
    
    @abstractmethod
    async def get_transaction_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[CreditTransaction]:
        """Get user's credit transaction history"""
        pass
    
    @abstractmethod
    async def get_model_cost(
        self,
        provider: str,
        model_name: str
    ) -> ModelCreditCost:
        """Get credit cost for a specific model"""
        pass


class CreditRepositoryInterface(ABC):
    """Interface for credit data persistence"""
    
    @abstractmethod
    async def get_user_balance(self, user_id: str) -> Optional[CreditBalance]:
        pass
    
    @abstractmethod
    async def update_user_balance(
        self,
        user_id: str,
        new_balance: int,
        credits_used_delta: int = 0,
        credits_purchased_delta: int = 0
    ) -> None:
        pass
    
    @abstractmethod
    async def create_transaction(
        self,
        transaction: CreditTransaction
    ) -> None:
        pass
    
    @abstractmethod
    async def get_transactions(
        self,
        user_id: str,
        limit: int,
        offset: int
    ) -> List[CreditTransaction]:
        pass