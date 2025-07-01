from typing import Callable

from fastapi import Depends, Request
from fastapi.responses import JSONResponse

from ..routers.auth import get_current_user_dependency
from ..models.credit import CreditConsumptionReason, CreditConsumptionRequest
from ..models.database import User
from ..services.credit.application.credit_service import CreditService, InsufficientCreditsError


def get_credit_service() -> CreditService:
    """Dependency to get credit service instance"""
    from ..services.credit.infrastructure.credit_repository import CreditRepository
    from ..core.database import get_sync_db_session
    
    def _create_service():
        db_gen = get_sync_db_session()
        db = next(db_gen)
        try:
            repository = CreditRepository(db)
            return CreditService(repository)
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
    
    return _create_service()


class CreditCheckDependency:
    """Dependency for checking user credits before processing requests"""
    
    def __init__(
        self,
        required_credits: int = 1,
        reason: CreditConsumptionReason = CreditConsumptionReason.CHAT_MESSAGE,
        consume_immediately: bool = False
    ):
        self.required_credits = required_credits
        self.reason = reason
        self.consume_immediately = consume_immediately
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user_dependency),
        credit_service: CreditService = Depends(get_credit_service)
    ) -> User:
        """Check if user has sufficient credits"""
        # Check credits
        has_credits = await credit_service.check_credits(
            current_user.id,
            self.required_credits
        )
        
        if not has_credits:
            balance = await credit_service.get_balance(current_user.id)
            raise InsufficientCreditsError(
                required=self.required_credits,
                available=balance.balance
            )
        
        # Optionally consume credits immediately
        if self.consume_immediately:
            consumption_request = CreditConsumptionRequest(
                amount=self.required_credits,
                reason=self.reason,
                description=f"Pre-consumed for {self.reason.value}"
            )
            await credit_service.consume_credits(current_user.id, consumption_request)
        
        return current_user


def require_credits(
    credits: int = 1,
    reason: CreditConsumptionReason = CreditConsumptionReason.CHAT_MESSAGE,
    consume_immediately: bool = False
):
    """Decorator to require credits for an endpoint"""
    return CreditCheckDependency(credits, reason, consume_immediately)


class CreditTrackingMiddleware:
    """Middleware to track credit usage across the application"""
    
    def __init__(self, app):
        self.app = app
        self.credit_endpoints = {
            "/chat/agents/chat": (1, CreditConsumptionReason.CHAT_MESSAGE),
            # Multi-agent conversations now check credits per AI request
            "/voice/generate": (3, CreditConsumptionReason.VOICE_GENERATION),
        }
    
    async def __call__(self, request: Request, call_next: Callable):
        # Check if this is a credit-consuming endpoint
        path = request.url.path
        
        if path in self.credit_endpoints:
            # Get user from request (would need proper implementation)
            # For now, just pass through
            # TODO: Implement proper credit tracking logic
            pass
        
        response = await call_next(request)
        return response


async def credit_exception_handler(_request: Request, exc: InsufficientCreditsError):
    """Handle insufficient credits exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "insufficient_credits",
            "detail": exc.detail,
            "required_credits": exc.args[0] if exc.args else None,
            "available_credits": exc.args[1] if len(exc.args) > 1 else None,
            "purchase_url": "/api/credits/purchase"
        }
    )