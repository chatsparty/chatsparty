from typing import List, Optional
from ..domain.entities import Message, ModelConfiguration
from ..domain.interfaces import ModelProviderInterface
from .unified_model_service import get_initialized_unified_model_service
from ....core.config import settings
from ....models.credit import CreditConsumptionRequest, CreditConsumptionReason
from ....middleware.credit_middleware import get_credit_service
from ...credit.application.credit_service import InsufficientCreditsError
import logging

logger = logging.getLogger(__name__)


class UnifiedModelProvider(ModelProviderInterface):
    def __init__(self):
        self._unified_service = None
    
    async def _get_service(self):
        """Get or initialize the unified service"""
        if self._unified_service is None:
            self._unified_service = await get_initialized_unified_model_service()
        return self._unified_service
    
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration,
        user_id: Optional[str] = None
    ) -> str:
        try:
            # Check and consume credits if user_id is provided and credits are enabled
            if user_id and settings.enable_credits:
                credit_service = get_credit_service()
                
                # Get the cost for this model
                model_cost = await credit_service.get_model_cost(
                    provider=model_config.provider,
                    model_name=model_config.model_name
                )
                
                # Create consumption request
                consumption_request = CreditConsumptionRequest(
                    amount=model_cost.cost_per_message,
                    reason=CreditConsumptionReason.CHAT_MESSAGE,
                    description=f"AI chat request using {model_config.provider}/{model_config.model_name}",
                    metadata={
                        "provider": model_config.provider,
                        "model": model_config.model_name
                    }
                )
                
                # Try to consume credits
                try:
                    await credit_service.consume_credits(user_id, consumption_request)
                except InsufficientCreditsError as e:
                    # Return a friendly message instead of raising to maintain conversation flow
                    return f"I'm sorry, but you don't have enough credits to continue this conversation. {str(e.detail)}"
            
            unified_service = await self._get_service()
            
            message_dicts = [
                {"role": msg.role, "content": msg.content} 
                for msg in messages
            ]
            
            return await unified_service.chat_completion(
                messages=message_dicts,
                system_prompt=system_prompt or "",
                provider=model_config.provider,
                model_name=model_config.model_name,
                api_key=model_config.api_key,
                base_url=model_config.base_url
            )
        except InsufficientCreditsError:
            # Already handled above
            raise
        except Exception as e:
            logger.error(f"Error in chat_completion: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"


