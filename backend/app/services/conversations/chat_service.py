from typing import List, Dict, Any, AsyncGenerator
import logging
from datetime import datetime
from ..ai_core.entities import Message, ConversationMessage
from ..ai_core.interfaces import (
    ModelProviderInterface, 
    AgentRepositoryInterface, 
    ConversationRepositoryInterface
)
from ..langraph import LangGraphChatService

logger = logging.getLogger(__name__)


class ChatService:
    """
    ChatService now delegates to LangGraphChatService for multi-agent conversations
    while maintaining the same interface for backward compatibility
    """
    
    def __init__(
        self,
        model_provider: ModelProviderInterface,
        agent_repository: AgentRepositoryInterface,
        conversation_repository: ConversationRepositoryInterface
    ):
        self._langraph_service = LangGraphChatService(
            model_provider,
            agent_repository,
            conversation_repository
        )
    
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Single agent chat - delegates to LangGraph service"""
        return await self._langraph_service.agent_chat(
            agent_id, message, conversation_id, user_id
        )
    
    async def _multi_agent_conversation_stream_supervised(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        LangGraph-based multi-agent conversation with streaming
        Replaces the old supervisor-based implementation
        """
        async for update in self._langraph_service.multi_agent_conversation_stream(
            conversation_id,
            agent_ids,
            initial_message,
            max_turns,
            user_id,
            file_attachments
        ):
            yield update
    
    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        """Get conversation history - delegates to LangGraph service"""
        return self._langraph_service.get_conversation_history(conversation_id, user_id)