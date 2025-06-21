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
    
# Module-level dictionary to hold asyncio.Event objects for active streams
_module_active_conversation_events: Dict[str, asyncio.Event] = {}

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
        # self._active_conversation_events: Dict[str, asyncio.Event] = {} # No longer instance variable

    async def _get_context_for_agent(self, conversation_id: str, initial_message_content: str, file_attachments: Optional[List[Dict[str, str]]]) -> List[Message]:
        """Helper to build context for an agent."""
        repo_messages = self._conversation_repository.get_conversation_messages(conversation_id)

        context_str = "Recent conversation:\n"
        # Use last N messages from repository for context
        recent_repo_messages = repo_messages[-5:] # Get last 5 messages from history

        for msg in recent_repo_messages:
            # Use the cleaned initial message if it's the very first user message
            # content_to_display = initial_message_content if msg.speaker == "user" and msg.content.endswith(initial_message_content) else msg.content
            # Simplified: just use msg.content. The _clean_message_for_display can be used by UI
            context_str += f"{msg.speaker or msg.agent_id or 'User'}: {msg.content}\n"

        context_str += f"\nPlease continue the conversation naturally from your perspective."

        if file_attachments:
            context_str += f"\n\nRemember: The user has attached {len(file_attachments)} file(s) with relevant content for this conversation."
            # Optionally, include file context again if it's very large and might be missed.
            # For now, assume the initial enhanced message is sufficient if files are part of it.

        return [Message(role="user", content=context_str)]

    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10, # Max_turns can now be a timeout or total interaction limit
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        if len(agent_ids) < 2:
            yield {"type": "error", "message": "At least 2 agents are required for a conversation"}
            return

        for agent_id_check in agent_ids:
            if not self._agent_repository.get_agent(agent_id_check, user_id):
                yield {"type": "error", "message": f"Agent {agent_id_check} not found"}
                return

        # Create or retrieve conversation details
        self._conversation_repository.create_conversation(
            conversation_id,
            user_id or "default_user",
            agent_ids=agent_ids,
            current_agent_index=0
        )

        # Store an event for this conversation stream
        if conversation_id not in _module_active_conversation_events:
            _module_active_conversation_events[conversation_id] = asyncio.Event()
        
        # Clear any previous event state
        _module_active_conversation_events[conversation_id].clear()


        enhanced_initial_message_content = initial_message
        if file_attachments:
            file_context = "\n\n=== ATTACHED FILES CONTEXT ===\n"
            for attachment in file_attachments:
                file_context += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                file_context += f"{attachment['content']}\n"
            file_context += "\n=== END FILE CONTEXT ===\n\n"
            enhanced_initial_message_content = file_context + initial_message
        
        # Add initial user message to repository
        user_msg_obj = Message(
            role="user",
            content=enhanced_initial_message_content, # Store the full message with context
            timestamp=datetime.now(),
            speaker="user", # Clearly mark as user
            user_id=user_id
        )
        self._conversation_repository.add_message(conversation_id, user_msg_obj, user_id)
        
        # Yield the cleaned initial message for display
        yield {
            "speaker": "user",
            "user_id": user_id,
            "message": initial_message, # Cleaned message for display
            "timestamp": user_msg_obj.timestamp.timestamp() if user_msg_obj.timestamp else asyncio.get_event_loop().time(),
            "type": "message"
        }

        turns_taken = 0
        try:
            while turns_taken < max_turns: # Loop indefinitely or until max_turns
                conv_details = self._conversation_repository.get_conversation_details(conversation_id, user_id)
                if not conv_details:
                    yield {"type": "error", "message": "Conversation details not found."}
                    break
                
                current_agent_index = conv_details.get("current_agent_index", 0)
                current_agent_ids = conv_details.get("agent_ids", [])

                if not current_agent_ids:
                    yield {"type": "info", "message": "No agents configured for this conversation."}
                    break # Or wait for agents to be added?

                current_agent_id = current_agent_ids[current_agent_index]
                current_agent = self._agent_repository.get_agent(current_agent_id, user_id)

                if not current_agent:
                    yield {"type": "error", "message": f"Agent {current_agent_id} not found during turn."}
                    # Skip to next agent or end? For now, end.
                    break
                
                yield {
                    "type": "typing",
                    "speaker": current_agent.name,
                    "agent_id": current_agent_id
                }

                # Build context from repository messages
                context_messages = await self._get_context_for_agent(conversation_id, initial_message, file_attachments)

                response = await self._model_provider.chat_completion(
                    context_messages, # These are Message objects from repo
                    current_agent.get_system_prompt(),
                    current_agent.model_config
                )

                agent_msg_obj = Message(
                    role="assistant",
                    content=response,
                    timestamp=datetime.now(),
                    agent_id=current_agent_id,
                    speaker=current_agent.name
                )
                self._conversation_repository.add_message(conversation_id, agent_msg_obj, user_id)

                yield {
                    "speaker": current_agent.name,
                    "agent_id": current_agent_id,
                    "message": response,
                    "timestamp": agent_msg_obj.timestamp.timestamp() if agent_msg_obj.timestamp else asyncio.get_event_loop().time(),
                    "type": "message"
                }

                next_agent_index = (current_agent_index + 1) % len(current_agent_ids)
                self._conversation_repository.update_conversation_metadata(
                    conversation_id, user_id, current_agent_index=next_agent_index
                )
                turns_taken += 1

                if "goodbye" in response.lower() or "end conversation" in response.lower(): # Agent ends convo
                    yield {"type": "info", "message": f"Conversation ended by {current_agent.name}."}
                    break

                # Wait for the event to be set by a new user message or timeout
                try:
                    # This is where the stream waits for a signal (new user message)
                    # or proceeds if no signal is configured to be waited on.
                    # To implement user-initiated turns:
                    if _module_active_conversation_events[conversation_id].is_set():
                        _module_active_conversation_events[conversation_id].clear() # Consume the event
                    else: # No new user message, so agent waits for its turn or for a user message
                        try:
                            # Wait for a signal from a new user message.
                            # Timeout can be configured if agents should speak after some inactivity.
                            await asyncio.wait_for(_module_active_conversation_events[conversation_id].wait(), timeout=300) # Wait 5 minutes
                            _module_active_conversation_events[conversation_id].clear() # Consume the event
                        except asyncio.TimeoutError:
                            # Agent's turn due to timeout (no user message)
                            # Or, if we don't want timeout-based agent turns, this means conversation might end.
                            # For now, let's assume if timeout, the agent still speaks.
                            # If we want the conversation to ONLY proceed on user input after first cycle,
                            # this timeout might lead to an "end of conversation" or a "waiting for user" message.
                            # Let's make it so agent speaks if timeout.
                            pass # Agent will speak

                except asyncio.TimeoutError: # This is from the wait_for above
                    yield {"type": "info", "message": f"Agent {current_agent.name} is responding after a period of inactivity."}
                    # If we want the conversation to end on timeout:
                    # yield {"type": "complete", "message": "Conversation timed out waiting for user input."}
                    # break

                # Small delay to allow other tasks, and prevent overly rapid agent succession if no user input
                await asyncio.sleep(0.5)

            yield {"type": "complete", "message": "Conversation stream finished (max turns reached or ended)."}
        except Exception as e:
            yield {"type": "error", "message": f"Stream error: {str(e)}"}
        finally:
            if conversation_id in _module_active_conversation_events:
                del _module_active_conversation_events[conversation_id]

    async def signal_new_message(self, conversation_id: str):
        """Called by the new message endpoint to signal the stream."""
        if conversation_id in _module_active_conversation_events:
            _module_active_conversation_events[conversation_id].set()
        else:
            # This might happen if the stream ended but a message was posted.
            # Or if the stream hasn't started yet (less likely for this call).
            print(f"Debug: signal_new_message called for {conversation_id} but no active event found.")


    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        messages = self._conversation_repository.get_conversation_messages(conversation_id, user_id)
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