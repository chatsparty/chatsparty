from typing import List, Dict, Any, AsyncGenerator
import asyncio
import logging
from datetime import datetime
from ..domain.entities import Message, ConversationMessage
from ..domain.interfaces import (
    ModelProviderInterface, 
    AgentRepositoryInterface, 
    ConversationRepositoryInterface
)
from ..supervisor.supervisor_agent import SupervisorAgent

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
        
        assistant_message = Message(role="assistant", content=response, speaker=agent.name, agent_id=agent_id)
        self._conversation_repository.add_message(conversation_id, assistant_message)
        
        return response
    
    async def multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> List[ConversationMessage]:
        """
        Multi-agent conversation managed by a supervisor agent.
        The supervisor is invisible and selects the most appropriate agent for each turn.
        """
        return await self._multi_agent_conversation_supervised(
            conversation_id, agent_ids, initial_message, max_turns, user_id, file_attachments
        )
    
    async def _multi_agent_conversation_supervised(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> List[ConversationMessage]:
        """
        Multi-agent conversation managed by a supervisor agent.
        The supervisor is invisible and selects the most appropriate agent for each turn.
        Supports both starting new conversations and continuing existing ones.
        """
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
        
        existing_conversation = self._conversation_repository.get_conversation(conversation_id, user_id)
        is_continuation = existing_conversation and len(existing_conversation) > 0
        
        if not existing_conversation:
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        enhanced_initial_message = initial_message
        if file_attachments:
            file_context = "\n\n=== ATTACHED FILES CONTEXT ===\n"
            for attachment in file_attachments:
                file_context += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                file_context += f"{attachment['content']}\n"
            file_context += "\n=== END FILE CONTEXT ===\n\n"
            enhanced_initial_message = file_context + initial_message
        
        conversation_log = []
        messages_before_new_user = 0
        
        if is_continuation:
            for msg in existing_conversation:
                if msg.role == "user":
                    display_content = self._clean_message_for_display(msg.content, msg.role)
                    conversation_log.append(ConversationMessage(
                        speaker="user",
                        message=display_content,
                        timestamp=msg.timestamp.timestamp() if msg.timestamp else asyncio.get_event_loop().time()
                    ))
                elif msg.role == "assistant":
                    conversation_log.append(ConversationMessage(
                        speaker=msg.speaker,
                        agent_id=msg.agent_id,
                        message=msg.content,
                        timestamp=msg.timestamp.timestamp() if msg.timestamp else asyncio.get_event_loop().time()
                    ))
            messages_before_new_user = len(conversation_log)
        
        user_message = Message(role="user", content=enhanced_initial_message, timestamp=datetime.now(), speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        conversation_log.append(ConversationMessage(
            speaker="user",
            message=initial_message,
            timestamp=asyncio.get_event_loop().time()
        ))
        
        supervisor = SupervisorAgent(self._model_provider, self._agent_repository)
        
        turn = 0
        while turn < max_turns:
            selected_agent_id = await supervisor.select_next_agent(
                conversation_log=conversation_log,
                agent_ids=agent_ids,
                user_id=user_id
            )
            
            if not selected_agent_id:
                selected_agent_id = agent_ids[turn % len(agent_ids)]
            
            current_agent = self._agent_repository.get_agent(selected_agent_id, user_id)
            
            context_messages = []
            recent_messages = conversation_log[-30:]
            context = "Conversation history:\n"
            for msg in recent_messages:
                context += f"{msg.speaker}: {msg.message}\n"
            
            last_message = conversation_log[-1] if conversation_log else None
            last_speaker = last_message.speaker if last_message else "unknown"
            
            context += f"\n{last_speaker} just said: '{last_message.message}'\n\n"
            context += f"You are in a group chat conversation. Respond naturally as you would in a casual group chat with friends or colleagues.\n"
            context += f"Guidelines:\n"
            context += f"- Match the tone and energy of the conversation\n"
            context += f"- Don't act like a customer service bot or assistant\n"
            context += f"- Don't force technical topics unless they're relevant\n"
            context += f"- Keep responses natural and conversational\n"
            context += f"- You can agree, disagree, add thoughts, make jokes, or simply acknowledge\n"
            context += f"- Respond in the same language as the conversation\n"
            context += f"\nIMPORTANT: Your response must be in this exact format:\n"
            context += f"LANGUAGE: [ISO 639-1 code like 'en', 'es', 'fr', etc.]\n"
            context += f"RESPONSE: [Your actual response as a natural participant in this group chat]"
            
            if file_attachments:
                context += f"\n\nNote: The user has attached {len(file_attachments)} file(s) with relevant content for this conversation."
            
            context_messages = [Message(role="user", content=context)]
            
            response = await self._model_provider.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_config,
                user_id=user_id
            )
            
            language = "en"
            actual_response = response
            
            if "LANGUAGE:" in response and "RESPONSE:" in response:
                lines = response.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith("LANGUAGE:"):
                        language = line.replace("LANGUAGE:", "").strip()
                    elif line.startswith("RESPONSE:"):
                        actual_response = '\n'.join(lines[i:]).replace("RESPONSE:", "", 1).strip()
                        break
            
            agent_message = Message(
                role="assistant", 
                content=actual_response,
                timestamp=datetime.now(),
                agent_id=selected_agent_id,
                speaker=current_agent.name
            )
            self._conversation_repository.add_message(conversation_id, agent_message, language=language)
            
            conversation_log.append(ConversationMessage(
                speaker=current_agent.name,
                agent_id=selected_agent_id,
                message=actual_response,
                timestamp=asyncio.get_event_loop().time()
            ))
            
            if "I'm sorry, but you don't have enough credits" in actual_response:
                break
            
            turn += 1
            
            should_end = await supervisor.should_end_conversation(
                conversation_log=conversation_log,
                max_turns_reached=(turn >= max_turns),
                user_id=user_id
            )
            
            if is_continuation:
                if should_end and (turn >= max_turns or self._has_strong_ending_signal(conversation_log[-3:])):
                    logger.info(f"Ending continuation: supervisor_decision={should_end}, turn={turn}/{max_turns}, strong_signal={self._has_strong_ending_signal(conversation_log[-3:])}")
                    break
            else:
                if should_end:
                    logger.info(f"Supervisor ended conversation at turn {turn}")
                    break
        
        logger.info(f"Returning {len(conversation_log)} messages (is_continuation: {is_continuation})")
        if is_continuation:
            logger.info(f"Continuation mode - messages_before_new_user: {messages_before_new_user}")
        
        for i, msg in enumerate(conversation_log[-5:]):
            logger.info(f"Message {len(conversation_log)-5+i}: {msg.speaker} - {msg.message[:50]}...")
        
        return conversation_log
    
    def _has_strong_ending_signal(self, recent_messages: List[ConversationMessage]) -> bool:
        """Check if there are strong signals that conversation should end
        
        This is a fallback mechanism - the supervisor should make the primary decision
        about when conversations end naturally.
        """
        explicit_end_commands = ["end conversation", "/end", "/quit", "/stop"]
        
        for msg in recent_messages:
            if any(cmd in msg.message.lower() for cmd in explicit_end_commands):
                return True
        return False
    
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Streaming multi-agent conversation managed by a supervisor agent.
        The supervisor is invisible and selects the most appropriate agent for each turn.
        """
        async for message in self._multi_agent_conversation_stream_supervised(
            conversation_id, agent_ids, initial_message, max_turns, user_id, file_attachments
        ):
            yield message
    
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
        Streaming multi-agent conversation managed by a supervisor agent.
        The supervisor is invisible and selects the most appropriate agent for each turn.
        Supports both starting new conversations and continuing existing ones.
        """
        if len(agent_ids) < 2:
            yield {"error": "At least 2 agents are required for a conversation"}
            return
        
        for agent_id in agent_ids:
            if not self._agent_repository.get_agent(agent_id, user_id):
                yield {"error": f"Agent {agent_id} not found"}
                return
        
        existing_conversation = self._conversation_repository.get_conversation(conversation_id, user_id)
        is_continuation = existing_conversation and len(existing_conversation) > 0
        
        if not existing_conversation:
            self._conversation_repository.create_conversation(conversation_id, user_id or "default")
        
        enhanced_initial_message = initial_message
        if file_attachments:
            file_context = "\n\n=== ATTACHED FILES CONTEXT ===\n"
            for attachment in file_attachments:
                file_context += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                file_context += f"{attachment['content']}\n"
            file_context += "\n=== END FILE CONTEXT ===\n\n"
            enhanced_initial_message = file_context + initial_message
        
        conversation_log = []
        
        if is_continuation:
            for msg in existing_conversation:
                if msg.role == "user":
                    display_content = self._clean_message_for_display(msg.content, msg.role)
                    conversation_log.append({
                        "speaker": "user",
                        "message": display_content,
                        "timestamp": msg.timestamp.timestamp() if msg.timestamp else asyncio.get_event_loop().time(),
                        "type": "message"
                    })
                elif msg.role == "assistant":
                    conversation_log.append({
                        "speaker": msg.speaker,
                        "agent_id": msg.agent_id,
                        "message": msg.content,
                        "timestamp": msg.timestamp.timestamp() if msg.timestamp else asyncio.get_event_loop().time(),
                        "type": "message"
                    })
        
        user_message = Message(role="user", content=enhanced_initial_message, timestamp=datetime.now(), speaker="user")
        self._conversation_repository.add_message(conversation_id, user_message)
        
        new_user_msg = {
            "speaker": "user",
            "message": initial_message,
            "timestamp": asyncio.get_event_loop().time(),
            "type": "message"
        }
        conversation_log.append(new_user_msg)
        yield new_user_msg
        
        supervisor = SupervisorAgent(self._model_provider, self._agent_repository)
        
        turn = 0
        while turn < max_turns:
            selected_agent_id = await supervisor.select_next_agent(
                conversation_log=[ConversationMessage(
                    speaker=msg["speaker"],
                    agent_id=msg.get("agent_id"),
                    message=msg["message"],
                    timestamp=msg["timestamp"]
                ) for msg in conversation_log if msg.get("type") == "message"],
                agent_ids=agent_ids,
                user_id=user_id
            )
            
            if not selected_agent_id:
                selected_agent_id = agent_ids[turn % len(agent_ids)]
            
            current_agent = self._agent_repository.get_agent(selected_agent_id, user_id)
            
            yield {
                "type": "typing",
                "speaker": current_agent.name,
                "agent_id": selected_agent_id
            }
            
            context_messages = []
            recent_messages = conversation_log[-30:]
            context = "Conversation history:\n"
            for msg in recent_messages:
                if msg.get("type") == "message":
                    context += f"{msg['speaker']}: {msg['message']}\n"
            
            last_message = None
            for msg in reversed(conversation_log):
                if msg.get("type") == "message":
                    last_message = msg
                    break
            
            last_speaker = last_message['speaker'] if last_message else "unknown"
            
            context += f"\n{last_speaker} just said: '{last_message['message']}'\n\n"
            context += f"You are in a group chat conversation. Respond naturally as you would in a casual group chat with friends or colleagues.\n"
            context += f"Guidelines:\n"
            context += f"- Match the tone and energy of the conversation\n"
            context += f"- Don't act like a customer service bot or assistant\n"
            context += f"- Don't force technical topics unless they're relevant\n"
            context += f"- Keep responses natural and conversational\n"
            context += f"- You can agree, disagree, add thoughts, make jokes, or simply acknowledge\n"
            context += f"- Respond in the same language as the conversation\n"
            context += f"\nIMPORTANT: Your response must be in this exact format:\n"
            context += f"LANGUAGE: [ISO 639-1 code like 'en', 'es', 'fr', etc.]\n"
            context += f"RESPONSE: [Your actual response as a natural participant in this group chat]"
            
            if file_attachments:
                context += f"\n\nNote: The user has attached {len(file_attachments)} file(s) with relevant content for this conversation."
            
            context_messages = [Message(role="user", content=context)]
            
            response = await self._model_provider.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_config,
                user_id=user_id
            )
            
            language = "en"
            actual_response = response
            
            if "LANGUAGE:" in response and "RESPONSE:" in response:
                lines = response.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith("LANGUAGE:"):
                        language = line.replace("LANGUAGE:", "").strip()
                    elif line.startswith("RESPONSE:"):
                        actual_response = '\n'.join(lines[i:]).replace("RESPONSE:", "", 1).strip()
                        break
            
            agent_message = Message(
                role="assistant", 
                content=actual_response,
                timestamp=datetime.now(),
                agent_id=selected_agent_id,
                speaker=current_agent.name
            )
            self._conversation_repository.add_message(conversation_id, agent_message, language=language)
            
            agent_msg = {
                "speaker": current_agent.name,
                "agent_id": selected_agent_id,
                "message": actual_response,
                "timestamp": asyncio.get_event_loop().time(),
                "type": "message"
            }
            conversation_log.append(agent_msg)
            yield agent_msg
            
            if "I'm sorry, but you don't have enough credits" in actual_response:
                break
            
            turn += 1
            
            should_end = await supervisor.should_end_conversation(
                conversation_log=[ConversationMessage(
                    speaker=msg["speaker"],
                    agent_id=msg.get("agent_id"),
                    message=msg["message"],
                    timestamp=msg["timestamp"]
                ) for msg in conversation_log if msg.get("type") == "message"],
                max_turns_reached=(turn >= max_turns),
                user_id=user_id
            )
            
            if is_continuation:
                if should_end and (turn >= max_turns or self._has_strong_ending_signal([
                    ConversationMessage(
                        speaker=msg["speaker"],
                        message=msg["message"],
                        timestamp=msg["timestamp"]
                    ) for msg in conversation_log[-3:] if msg.get("type") == "message"
                ])):
                    logger.info(f"Ending continuation stream: supervisor_decision={should_end}, turn={turn}/{max_turns}")
                    break
            else:
                if should_end:
                    logger.info(f"Supervisor ended streaming conversation at turn {turn}")
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