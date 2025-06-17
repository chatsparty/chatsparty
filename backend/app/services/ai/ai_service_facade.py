from typing import List, Dict, Any, AsyncGenerator
from .domain.interfaces import AIServiceInterface
from .application.agent_service import AgentService
from .application.chat_service import ChatService
from .infrastructure.repositories import InMemoryAgentRepository, InMemoryConversationRepository
from .infrastructure.model_providers import UnifiedModelProvider
import os


class AIServiceFacade(AIServiceInterface):
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "gemma2:2b")
        
        self._agent_repository = InMemoryAgentRepository()
        self._conversation_repository = InMemoryConversationRepository()
        
        self._agent_service = AgentService(self._agent_repository)
        
        self._model_provider = UnifiedModelProvider()
        self._chat_service = ChatService(
            self._model_provider,
            self._agent_repository,
            self._conversation_repository
        )
    
    def create_agent(
        self, 
        agent_id: str, 
        name: str, 
        prompt: str, 
        characteristics: str,
        model_config: dict = None,
        chat_style: dict = None,
        connection_id: str = None
    ):
        return self._agent_service.create_agent(
            agent_id, name, prompt, characteristics, model_config, chat_style, connection_id
        )
    
    def get_agent(self, agent_id: str):
        return self._agent_service.get_agent(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        return self._agent_service.list_agents()
    
    def delete_agent(self, agent_id: str) -> bool:
        return self._agent_service.delete_agent(agent_id)
    
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default"
    ) -> str:
        return await self._chat_service.agent_chat(agent_id, message, conversation_id)
    
    async def multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10
    ) -> List[Dict[str, Any]]:
        conversation_messages = await self._chat_service.multi_agent_conversation(
            conversation_id, agent_ids, initial_message, max_turns
        )
        return [
            {
                "speaker": msg.speaker,
                "message": msg.message,
                "timestamp": msg.timestamp,
                "agent_id": msg.agent_id,
                "type": getattr(msg, 'message_type', 'message')
            }
            for msg in conversation_messages
        ]
    
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10
    ) -> AsyncGenerator[Dict[str, Any], None]:
        async for message in self._chat_service.multi_agent_conversation_stream(
            conversation_id, agent_ids, initial_message, max_turns
        ):
            yield message
    
    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        return self._chat_service.get_conversation_history(conversation_id)


_ai_service_facade = None


def get_ai_service() -> AIServiceFacade:
    global _ai_service_facade
    if _ai_service_facade is None:
        _ai_service_facade = AIServiceFacade()
    return _ai_service_facade