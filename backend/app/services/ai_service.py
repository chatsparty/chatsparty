"""
Refactored AI Service - Main coordinator for all AI-related operations

This service coordinates between the specialized modules:
- ai_core: Shared domain entities and interfaces
- agents: Agent management and configuration
- conversations: Chat services and conversation orchestration  
- models: Model providers and configurations
"""

import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from .ai_core import (
    Agent, ChatStyle, ModelConfiguration, VoiceConfig,
    AIServiceInterface
)

from .shared import SessionManager

from .agents import AgentService
from .conversations import ChatService
from .models import UnifiedModelProvider



class AIServiceFacade(AIServiceInterface):
    """
    Main AI Service Facade - coordinates between specialized modules
    
    This facade maintains backward compatibility while delegating to 
    the new modular architecture.
    """

    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "gemma2:2b")
        self._model_provider = UnifiedModelProvider()
        
        
        self._agent_service = None
        self._chat_service = None

    async def _get_agent_service(self) -> AgentService:
        """Get or create agent service"""
        if self._agent_service is None:
            async with SessionManager.get_agent_repository() as agent_repo:
                self._agent_service = AgentService(agent_repo)
        return self._agent_service

    async def _get_chat_service(self) -> ChatService:
        """Get or create chat service"""
        if self._chat_service is None:
            async with SessionManager.get_agent_repository() as agent_repo, \
                    SessionManager.get_conversation_repository() as conv_repo:
                self._chat_service = ChatService(
                    self._model_provider,
                    agent_repo,
                    conv_repo
                )
        return self._chat_service



    async def create_agent(
        self,
        name: str,
        prompt: str,
        characteristics: str,
        user_id: str,
        gender: str = "neutral",
        model_config: dict = None,
        chat_style: dict = None,
        connection_id: str = None,
        voice_config: dict = None,
    ):
        """Create a new agent"""
        async with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return await agent_service.create_agent(
                name, prompt, characteristics, user_id, gender, 
                model_config, chat_style, connection_id, voice_config
            )

    async def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        """Get an agent by ID - direct repository access"""
        async with SessionManager.get_agent_repository() as agent_repo:
            return await agent_repo.get_agent(agent_id, user_id)

    async def list_agents(self, user_id: str = None) -> List[Dict[str, Any]]:
        """List all agents for a user"""
        async with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return await agent_service.list_agents_formatted(user_id)

    async def update_agent(
        self,
        agent_id: str,
        name: str,
        prompt: str,
        characteristics: str,
        gender: str = None,
        model_config: dict = None,
        chat_style: dict = None,
        connection_id: str = None,
        voice_config: dict = None,
    ):
        """Update an existing agent"""
        async with SessionManager.get_agent_repository() as agent_repo:
            existing_agent = await agent_repo.get_agent(agent_id)
            if not existing_agent:
                return None

            if model_config and not isinstance(model_config, dict):
                raise TypeError(f"model_config must be a dict, got {type(model_config)}")
                
            model_configuration = ModelConfiguration(
                provider=model_config.get("provider", "ollama"),
                model_name=model_config.get("model_name", "gemma3:4b"),
                api_key=model_config.get("api_key"),
                base_url=model_config.get("base_url")
            ) if model_config else existing_agent.ai_config

            if chat_style and not isinstance(chat_style, dict):
                raise TypeError(f"chat_style must be a dict, got {type(chat_style)}")
                
            chat_style_obj = ChatStyle(
                friendliness=chat_style.get("friendliness", "friendly"),
                response_length=chat_style.get("response_length", "medium"),
                personality=chat_style.get("personality", "balanced"),
                humor=chat_style.get("humor", "light"),
                expertise_level=chat_style.get("expertise_level", "expert")
            ) if chat_style else existing_agent.chat_style

            if voice_config and not isinstance(voice_config, dict):
                raise TypeError(f"voice_config must be a dict, got {type(voice_config)}")
                
            voice_config_obj = VoiceConfig(
                voice_enabled=voice_config.get("voice_enabled", False),
                voice_connection_id=voice_config.get("voice_connection_id"),
                selected_voice_id=voice_config.get("selected_voice_id"),
                podcast_settings=voice_config.get("podcast_settings")
            ) if voice_config else existing_agent.voice_config

            updated_agent = Agent(
                agent_id=agent_id,
                name=name or existing_agent.name,
                prompt=prompt or existing_agent.prompt,
                characteristics=characteristics or existing_agent.characteristics,
                ai_config=model_configuration,
                chat_style=chat_style_obj,
                connection_id=connection_id or existing_agent.connection_id,
                gender=gender if gender is not None else existing_agent.gender,
                voice_config=voice_config_obj,
            )

            return await agent_repo.update_agent(updated_agent)

    async def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        """Delete an agent - direct repository access"""
        async with SessionManager.get_agent_repository() as agent_repo:
            return await agent_repo.delete_agent(agent_id, user_id)

    async def agent_chat(
        self,
        agent_id: str,
        message: str,
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Single agent chat"""
        
        async with SessionManager.get_agent_repository() as agent_repo, \
                SessionManager.get_conversation_repository() as conv_repo:
            chat_service = ChatService(
                self._model_provider,
                agent_repo,
                conv_repo
            )
            return await chat_service.agent_chat(agent_id, message, conversation_id, user_id)

    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None,
        project_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streaming multi-agent conversation"""
        async with SessionManager.get_agent_repository() as agent_repo, \
                SessionManager.get_conversation_repository() as conv_repo:
            chat_service = ChatService(
                self._model_provider,
                agent_repo,
                conv_repo
            )
            
            async for message in chat_service._multi_agent_conversation_stream_supervised(
                conversation_id, agent_ids, initial_message, max_turns, user_id, file_attachments
            ):
                yield message

    async def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        """Get conversation history"""
        chat_service = await self._get_chat_service()
        return chat_service.get_conversation_history(conversation_id, user_id)

    async def get_all_conversations(self, user_id: str = None) -> List[Dict[str, Any]]:
        """Get all conversations from database"""
        async with SessionManager.get_conversation_repository() as conv_repo:
            return await conv_repo.get_all_conversations(user_id)

    async def get_conversation_by_id(self, conversation_id: str, user_id: str = None) -> Dict[str, Any]:
        """Get a specific conversation by ID, including shared conversations"""
        async with SessionManager.get_conversation_repository() as conv_repo:
            return await conv_repo.get_conversation_by_id(conversation_id, user_id)

    async def update_conversation_sharing(self, conversation_id: str, is_shared: bool, user_id: str) -> bool:
        """Update the sharing status of a conversation"""
        async with SessionManager.get_conversation_repository() as conv_repo:
            return await conv_repo.update_conversation_sharing(conversation_id, is_shared, user_id)

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation and all its messages"""
        async with SessionManager.get_conversation_repository() as conv_repo:
            return await conv_repo.delete_conversation(conversation_id, user_id)

    async def simple_chat(self, message: str, user_id: str = None) -> str:
        """Simple chat without agents for utility purposes like content enhancement"""
        try:
            
            from .ai_core.entities import Message, ModelConfiguration
            messages = [Message(role="user", content=message)]
            model_config = ModelConfiguration(provider="ollama", model_name=self.model_name)
            response = await self._model_provider.chat_completion(
                messages, "", model_config, user_id
            )
            return response
        except Exception as e:
            return f"Error processing with AI: {str(e)}"
    



_ai_service = None

def get_ai_service() -> AIServiceFacade:
    """Get singleton AI service instance"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIServiceFacade()
    return _ai_service