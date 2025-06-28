from typing import List, Optional
from ..domain.entities import Message, ModelConfiguration
from ..domain.interfaces import ModelProviderInterface
from .unified_model_service import get_initialized_unified_model_service


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
        model_config: ModelConfiguration
    ) -> str:
        try:
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
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}"


