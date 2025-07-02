from typing import List, Dict, Any, AsyncGenerator
import asyncio
import logging
from datetime import datetime
from ..ai_core.entities import Message, ConversationMessage
from ..ai_core.interfaces import (
    ModelProviderInterface, 
    AgentRepositoryInterface, 
    ConversationRepositoryInterface
)
from .supervisor_agent import SupervisorAgent

logger = logging.getLogger(__name__)


class ChatService:
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
            agent.model_config,
            user_id=user_id
        )
        
        assistant_message = Message(role="assistant", content=response, speaker=agent.name)
        self._conversation_repository.add_message(conversation_id, assistant_message)
        
        return response
    
    
    async def _multi_agent_conversation_stream_supervised(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streaming version of multi-agent conversation"""
        
        agents = []
        for agent_id in agent_ids:
            agent = self._agent_repository.get_agent(agent_id, user_id)
            if agent:
                agents.append(agent)
        
        if not agents:
            return
        
        if not self._conversation_repository.get_conversation(conversation_id, user_id):
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        # Save the initial user message
        user_message = Message(role="user", content=initial_message, speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        supervisor_agent = SupervisorAgent(agents, self._model_provider)
        
        conversation_messages = []
        current_message = initial_message
        
        for turn in range(max_turns):
            try:
                next_agent_id = await supervisor_agent.determine_next_speaker(
                    current_message, conversation_messages, user_id
                )
                
                if next_agent_id == "CONVERSATION_COMPLETE":
                    yield {
                        "type": "conversation_complete",
                        "message": "Conversation has reached a natural conclusion"
                    }
                    break
                
                next_agent = next(agent for agent in agents if agent.agent_id == next_agent_id)
                
                yield {
                    "type": "agent_thinking",
                    "agent_id": next_agent_id,
                    "agent_name": next_agent.name,
                    "message": f"{next_agent.name} is thinking..."
                }
                
                conversation_history = self._conversation_repository.get_conversation(conversation_id, user_id)
                
                response = await self._model_provider.chat_completion(
                    conversation_history + [Message(role="user", content=current_message)],
                    next_agent.get_system_prompt(),
                    next_agent.model_config,
                    user_id=user_id
                )
                
                timestamp = datetime.now().timestamp()
                conv_msg = ConversationMessage(
                    speaker=next_agent.name,
                    message=response,
                    timestamp=timestamp,
                    agent_id=next_agent_id
                )
                
                conversation_messages.append(conv_msg)
                
                message_obj = Message(
                    role="assistant", 
                    content=response, 
                    speaker=next_agent.name,
                    agent_id=next_agent_id
                )
                self._conversation_repository.add_message(conversation_id, message_obj)
                
                yield {
                    "type": "agent_response",
                    "agent_id": next_agent_id,
                    "agent_name": next_agent.name,
                    "message": response,
                    "timestamp": timestamp
                }
                
                current_message = response
                
            except Exception as e:
                logger.error(f"Error in multi-agent conversation turn {turn}: {e}")
                yield {
                    "type": "error",
                    "message": f"Error in conversation: {str(e)}"
                }
                break
    
    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
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