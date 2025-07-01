from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CreditTransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"
    REFUND = "refund"
    BONUS = "bonus"
    PURCHASE = "purchase"


class CreditConsumptionReason(str, Enum):
    CHAT_MESSAGE = "chat_message"
    MULTI_AGENT_CONVERSATION = "multi_agent_conversation"
    VOICE_GENERATION = "voice_generation"
    FILE_PROCESSING = "file_processing"
    PROJECT_VM_USAGE = "project_vm_usage"


class CreditPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class CreditTransaction(BaseModel):
    id: str
    user_id: str
    amount: int
    transaction_type: CreditTransactionType
    reason: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
    balance_after: int
    created_at: datetime


class CreditBalance(BaseModel):
    user_id: str
    balance: int = Field(ge=0)
    lifetime_credits_used: int = Field(ge=0)
    lifetime_credits_purchased: int = Field(ge=0)
    credit_plan: CreditPlan = CreditPlan.FREE
    last_refill_at: Optional[datetime] = None


class CreditConsumptionRequest(BaseModel):
    amount: int = Field(gt=0)
    reason: CreditConsumptionReason
    description: Optional[str] = None
    metadata: Optional[dict] = None


class CreditPurchaseRequest(BaseModel):
    credits: int = Field(gt=0)
    payment_method: str
    payment_token: str


class ModelCreditCost(BaseModel):
    """Define credit costs for different models and providers"""
    provider: str
    model_name: str
    cost_per_message: int = 1
    cost_per_1k_tokens: Optional[int] = None
    is_default_model: bool = False
    
    class Config:
        pass