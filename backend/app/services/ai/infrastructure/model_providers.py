from typing import List
from ..domain.entities import Message, ModelConfiguration
from ..domain.interfaces import ModelProviderInterface
from .unified_model_service import get_unified_model_service


class UnifiedModelProvider(ModelProviderInterface):
    def __init__(self):
        self.unified_service = get_unified_model_service()
    
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration
    ) -> str:
        try:
            message_dicts = [
                {"role": msg.role, "content": msg.content} 
                for msg in messages
            ]
            
            return await self.unified_service.chat_completion(
                messages=message_dicts,
                system_prompt=system_prompt or "",
                provider=model_config.provider,
                model_name=model_config.model_name,
                api_key=model_config.api_key,
                base_url=model_config.base_url
            )
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}"


