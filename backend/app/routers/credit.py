from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..models.database import User
from ..models.credit import CreditBalance, CreditTransaction
from ..services.credit.application.credit_service import CreditService
from ..services.credit.infrastructure.credit_repository import CreditRepository
from ..core.database import get_sync_db_session
from .auth import get_current_user_dependency
from sqlmodel import Session

router = APIRouter(prefix="/credits", tags=["credits"])


def get_credit_service(db: Session = Depends(get_sync_db_session)) -> CreditService:
    """Dependency to get credit service instance"""
    repository = CreditRepository(db)
    return CreditService(repository)


@router.get("/balance", response_model=CreditBalance)
async def get_user_balance(
    current_user: User = Depends(get_current_user_dependency),
    credit_service: CreditService = Depends(get_credit_service)
):
    """Get current user's credit balance"""
    try:
        balance = await credit_service.get_balance(current_user.id)
        return balance
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get credit balance: {str(e)}"
        )


@router.get("/transactions", response_model=List[CreditTransaction])
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user_dependency),
    credit_service: CreditService = Depends(get_credit_service)
):
    """Get user's credit transaction history"""
    try:
        transactions = await credit_service.get_transaction_history(
            current_user.id, limit, offset
        )
        return transactions
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get transaction history: {str(e)}"
        )


@router.get("/check/{amount}")
async def check_sufficient_credits(
    amount: int,
    current_user: User = Depends(get_current_user_dependency),
    credit_service: CreditService = Depends(get_credit_service)
):
    """Check if user has sufficient credits for an operation"""
    try:
        has_credits = await credit_service.check_credits(current_user.id, amount)
        balance = await credit_service.get_balance(current_user.id)
        
        return {
            "has_sufficient_credits": has_credits,
            "required_credits": amount,
            "current_balance": balance.balance,
            "difference": balance.balance - amount
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to check credits: {str(e)}"
        )