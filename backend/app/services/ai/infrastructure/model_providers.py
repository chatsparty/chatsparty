import asyncio
import ollama
from typing import List
from ..domain.entities import Message, ModelConfiguration
from ..domain.interfaces import ModelProviderInterface
from ...unified_model_service import get_unified_model_service


class OllamaModelProvider(ModelProviderInterface):
    def __init__(self):
        self.client = ollama.Client()
    
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration
    ) -> str:
        try:
            formatted_messages = []
            
            if system_prompt:
                formatted_messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            formatted_messages.extend([
                {"role": msg.role, "content": msg.content} 
                for msg in messages
            ])
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat(
                    model=model_config.model_name,
                    messages=formatted_messages
                )
            )
            
            return response['message']['content']
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}"


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


class ModelProviderFactory:
    @staticmethod
    def create_provider(provider_type: str) -> ModelProviderInterface:
        if provider_type == "ollama":
            return OllamaModelProvider()
        else:
            return UnifiedModelProvider()