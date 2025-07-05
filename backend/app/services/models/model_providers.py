from typing import List, Optional
from ..ai_core.entities import Message, ModelConfiguration
from ..ai_core.interfaces import ModelProviderInterface
from .langchain_model_service import get_initialized_langchain_model_service
from ...core.config import settings
from ...models.credit import CreditConsumptionRequest, CreditConsumptionReason
from ...middleware.credit_middleware import get_credit_service
from ..credit.application.credit_service import InsufficientCreditsError
import logging

logger = logging.getLogger(__name__)


class UnifiedModelProvider(ModelProviderInterface):
    def __init__(self):
        self._langchain_service = None
    
    async def _get_service(self):
        """Get or initialize the LangChain service"""
        if self._langchain_service is None:
            self._langchain_service = await get_initialized_langchain_model_service()
        return self._langchain_service
    
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration,
        user_id: Optional[str] = None,
        is_supervisor_call: bool = False
    ) -> str:
        try:
            if user_id and settings.enable_credits and not is_supervisor_call:
                credit_service = get_credit_service()
                
                model_cost = await credit_service.get_model_cost(
                    provider=model_config.provider,
                    model_name=model_config.model_name
                )
                
                consumption_request = CreditConsumptionRequest(
                    amount=model_cost.cost_per_message,
                    reason=CreditConsumptionReason.CHAT_MESSAGE,
                    description=f"AI chat request using {model_config.provider}/{model_config.model_name}",
                    metadata={
                        "provider": model_config.provider,
                        "model": model_config.model_name
                    }
                )
                
                try:
                    await credit_service.consume_credits(user_id, consumption_request)
                except InsufficientCreditsError as e:
                    return f"I'm sorry, but you don't have enough credits to continue this conversation. {str(e.detail)}"
            
            langchain_service = await self._get_service()
            
            message_dicts = []
            for msg in messages:
                content = msg.content
                # Add speaker information in a way that doesn't trigger pattern completion
                if msg.role == "assistant" and hasattr(msg, 'speaker') and msg.speaker:
                    content = f"{msg.speaker} said: {msg.content}"
                
                message_dicts.append({"role": msg.role, "content": content})
            
            return await langchain_service.chat_completion(
                messages=message_dicts,
                system_prompt=system_prompt or "",
                provider=model_config.provider,
                model_name=model_config.model_name,
                api_key=model_config.api_key,
                base_url=model_config.base_url
            )
        except InsufficientCreditsError:
            raise
        except Exception as e:
            logger.error(f"Error in chat_completion: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"