from typing import List, Dict, Any, AsyncGenerator
import asyncio
from datetime import datetime
from ..domain.entities import Message, ConversationMessage
from ..domain.interfaces import (
    ModelProviderInterface, 
    AgentRepositoryInterface, 
    ConversationRepositoryInterface
)


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
            agent.model_config
        )
        
        assistant_message = Message(role="assistant", content=response, speaker=agent.name, agent_id=agent_id)
        self._conversation_repository.add_message(conversation_id, assistant_message)
        
        return response
    
    async def multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> List[ConversationMessage]:
        if len(agent_ids) < 2:
            return [ConversationMessage(
                speaker="system",
                message="At least 2 agents are required for a conversation",
                timestamp=asyncio.get_event_loop().time()
            )]
        
        for agent_id in agent_ids:
            if not self._agent_repository.get_agent(agent_id, user_id):
                return [ConversationMessage(
                    speaker="system",
                    message=f"Agent {agent_id} not found",
                    timestamp=asyncio.get_event_loop().time()
                )]
        
        if not self._conversation_repository.get_conversation(conversation_id, user_id):
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        enhanced_initial_message = initial_message
        if file_attachments:
            file_context = "\n\n=== ATTACHED FILES CONTEXT ===\n"
            for attachment in file_attachments:
                file_context += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                file_context += f"{attachment['content']}\n"
            file_context += "\n=== END FILE CONTEXT ===\n\n"
            enhanced_initial_message = file_context + initial_message
        
        user_message = Message(role="user", content=enhanced_initial_message, timestamp=datetime.now(), speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        conversation_log = []
        
        conversation_log.append(ConversationMessage(
            speaker="user",
            message=initial_message,
            timestamp=asyncio.get_event_loop().time()
        ))
        
        current_agent_index = 0
        
        for turn in range(max_turns):
            current_agent_id = agent_ids[current_agent_index]
            current_agent = self._agent_repository.get_agent(current_agent_id, user_id)
            
            context_messages = []
            if len(conversation_log) > 1:
                recent_messages = conversation_log[-30:]
                context = "Recent conversation:\n"
                for msg in recent_messages:
                    display_message = initial_message if msg.speaker == "user" and msg == conversation_log[0] else msg.message
                    context += f"{msg.speaker}: {display_message}\n"
                context += f"\nPlease continue the conversation naturally from your perspective."
                
                if file_attachments:
                    context += f"\n\nRemember: The user has attached {len(file_attachments)} file(s) with relevant content for this conversation."
                
                context_messages = [Message(role="user", content=context)]
            else:
                context_messages = [Message(role="user", content=enhanced_initial_message)]
            
            response = await self._model_provider.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_config
            )
            
            agent_message = Message(
                role="assistant", 
                content=response, 
                timestamp=datetime.now(),
                agent_id=current_agent_id,
                speaker=current_agent.name
            )
            self._conversation_repository.add_message(conversation_id, agent_message)
            
            conversation_log.append(ConversationMessage(
                speaker=current_agent.name,
                agent_id=current_agent_id,
                message=response,
                timestamp=asyncio.get_event_loop().time()
            ))
            
            current_agent_index = (current_agent_index + 1) % len(agent_ids)
            
            if "goodbye" in response.lower() or "end conversation" in response.lower():
                break
        
        return conversation_log
    
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        if len(agent_ids) < 2:
            yield {"error": "At least 2 agents are required for a conversation"}
            return
        
        for agent_id in agent_ids:
            if not self._agent_repository.get_agent(agent_id, user_id):
                yield {"error": f"Agent {agent_id} not found"}
                return
        
        if not self._conversation_repository.get_conversation(conversation_id, user_id):
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        enhanced_initial_message = initial_message
        if file_attachments:
            file_context = "\n\n=== ATTACHED FILES CONTEXT ===\n"
            for attachment in file_attachments:
                file_context += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                file_context += f"{attachment['content']}\n"
            file_context += "\n=== END FILE CONTEXT ===\n\n"
            enhanced_initial_message = file_context + initial_message
        
        user_message = Message(role="user", content=enhanced_initial_message, timestamp=datetime.now(), speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        conversation_log = []
        
        initial_msg = {
            "speaker": "user",
            "message": initial_message,
            "timestamp": asyncio.get_event_loop().time(),
            "type": "message"
        }
        conversation_log.append(initial_msg)
        yield initial_msg
        
        current_agent_index = 0
        
        for turn in range(max_turns):
            current_agent_id = agent_ids[current_agent_index]
            current_agent = self._agent_repository.get_agent(current_agent_id, user_id)
            
            yield {
                "type": "typing",
                "speaker": current_agent.name,
                "agent_id": current_agent_id
            }
            
            context_messages = []
            if len(conversation_log) > 1:
                recent_messages = conversation_log[-5:]
                context = "Recent conversation:\n"
                for msg in recent_messages:
                    if msg.get("type") == "message":
                        display_message = initial_message if msg['speaker'] == "user" and msg == conversation_log[0] else msg['message']
                        context += f"{msg['speaker']}: {display_message}\n"
                context += f"\nPlease continue the conversation naturally from your perspective."
                
                if file_attachments:
                    context += f"\n\nRemember: The user has attached {len(file_attachments)} file(s) with relevant content for this conversation."
                
                context_messages = [Message(role="user", content=context)]
            else:
                context_messages = [Message(role="user", content=enhanced_initial_message)]
            
            response = await self._model_provider.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_config
            )
            
            agent_message = Message(
                role="assistant", 
                content=response, 
                timestamp=datetime.now(),
                agent_id=current_agent_id,
                speaker=current_agent.name
            )
            self._conversation_repository.add_message(conversation_id, agent_message)
            
            agent_msg = {
                "speaker": current_agent.name,
                "agent_id": current_agent_id,
                "message": response,
                "timestamp": asyncio.get_event_loop().time(),
                "type": "message"
            }
            conversation_log.append(agent_msg)
            yield agent_msg
            
            current_agent_index = (current_agent_index + 1) % len(agent_ids)
            
            if "goodbye" in response.lower() or "end conversation" in response.lower():
                break
            
            await asyncio.sleep(1)
    
    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        messages = self._conversation_repository.get_conversation(conversation_id, user_id)
        return [
            {
                "role": msg.role,
                "content": self._clean_message_for_display(msg.content, msg.role),
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None
            }
            for msg in messages
        ]
    
    def _clean_message_for_display(self, content: str, role: str) -> str:
        """Remove file context from user messages for display purposes"""
        if role == "user" and "=== ATTACHED FILES CONTEXT ===" in content:
            parts = content.split("=== END FILE CONTEXT ===\n\n")
            if len(parts) > 1:
                return parts[1]
        return content