from typing import List, Dict, Any, AsyncGenerator
import logging
from datetime import datetime
from ..ai_core.entities import Message, ConversationMessage
from ..ai_core.interfaces import (
    ModelProviderInterface, 
    AgentRepositoryInterface, 
    ConversationRepositoryInterface
)
from .multi_agent_graph import MultiAgentGraph

logger = logging.getLogger(__name__)


class LangGraphChatService:
    def __init__(
        self,
        model_provider: ModelProviderInterface,
        agent_repository: AgentRepositoryInterface,
        conversation_repository: ConversationRepositoryInterface
    ):
        self._model_provider = model_provider
        self._agent_repository = agent_repository
        self._conversation_repository = conversation_repository
    
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Single agent chat - unchanged from original implementation"""
        agent = self._agent_repository.get_agent(agent_id, user_id)
        if not agent:
            return f"Agent {agent_id} not found"
        
        if not self._conversation_repository.get_conversation(conversation_id, user_id):
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        user_message = Message(role="user", content=message, speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        conversation_messages = self._conversation_repository.get_conversation(conversation_id, user_id)
        
        response = await self._model_provider.chat_completion(
            conversation_messages,
            agent.get_system_prompt(),
            agent.ai_model_config,
            user_id=user_id
        )
        
        assistant_message = Message(role="assistant", content=response, speaker=agent.name)
        self._conversation_repository.add_message(conversation_id, assistant_message)
        
        return response
    
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """LangGraph-based multi-agent conversation with streaming"""
        
        # Get agents
        agents = []
        for agent_id in agent_ids:
            agent = self._agent_repository.get_agent(agent_id, user_id)
            if agent:
                agents.append(agent)
        
        if not agents:
            yield {
                "type": "error",
                "message": "No valid agents found"
            }
            return
        
        # Create conversation if it doesn't exist
        if not self._conversation_repository.get_conversation(conversation_id, user_id):
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        # Save the initial user message
        user_message = Message(role="user", content=initial_message, speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        # Create and run LangGraph workflow
        multi_agent_graph = MultiAgentGraph(
            agents=agents,
            model_provider=self._model_provider,
            max_turns=max_turns
        )
        
        try:
            async for update in multi_agent_graph.run_conversation(
                conversation_id=conversation_id,
                initial_message=initial_message,
                user_id=user_id
            ):
                # Save agent responses to conversation repository
                if update.get("type") == "agent_response":
                    message_obj = Message(
                        role="assistant",
                        content=update["message"],
                        speaker=update["agent_name"],
                        agent_id=update["agent_id"]
                    )
                    self._conversation_repository.add_message(conversation_id, message_obj)
                
                # Yield the update to the client
                yield update
                
        except Exception as e:
            logger.error(f"Error in LangGraph multi-agent conversation: {e}")
            yield {
                "type": "error",
                "message": f"Error in conversation: {str(e)}"
            }
    
    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        """Get conversation history - unchanged from original"""
        messages = self._conversation_repository.get_conversation(conversation_id, user_id)
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                "speaker": msg.speaker,
                "agent_id": msg.agent_id
            }
            for msg in messages
        ]