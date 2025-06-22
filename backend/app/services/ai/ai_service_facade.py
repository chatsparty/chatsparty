import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from .application.agent_service import AgentService
from .application.chat_service import ChatService
from .application.enhanced_chat_service import EnhancedChatService
from .application.project_enhanced_chat_service import ProjectEnhancedChatService
from .domain.entities import Agent, ChatStyle, ModelConfiguration, VoiceConfig
from .domain.interfaces import AIServiceInterface
from .infrastructure.model_providers import UnifiedModelProvider
from .infrastructure.repositories import InMemoryConversationRepository
from .infrastructure.session_manager import SessionManager


class AIServiceFacade(AIServiceInterface):
    """AI Service Facade with proper session management"""

    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "gemma2:2b")
        self._model_provider = UnifiedModelProvider()

    def create_agent(
        self,
        name: str,
        prompt: str,
        characteristics: str,
        user_id: str,
        model_config: dict = None,
        chat_style: dict = None,
        connection_id: str = None,
        voice_config: dict = None,
        mcp_tools: List[str] = None,
        mcp_tool_config: dict = None
    ):
        with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return agent_service.create_agent(
                name, prompt, characteristics, user_id, model_config, chat_style, connection_id, voice_config, mcp_tools, mcp_tool_config
            )

    def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return agent_service.get_agent(agent_id, user_id)

    def list_agents(self, user_id: str = None) -> List[Dict[str, Any]]:
        with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return agent_service.list_agents(user_id)

    def update_agent(
        self,
        agent_id: str,
        name: str,
        prompt: str,
        characteristics: str,
        model_config: dict = None,
        chat_style: dict = None,
        connection_id: str = None,
        voice_config: dict = None,
        mcp_tools: List[str] = None,
        mcp_tool_config: dict = None
    ):
        with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)

            existing_agent = agent_service.get_agent(agent_id)
            if not existing_agent:
                return None

            model_configuration = ModelConfiguration(
                provider=model_config.get("provider", "ollama"),
                model_name=model_config.get("model_name", "gemma3:4b"),
                api_key=model_config.get("api_key"),
                base_url=model_config.get("base_url")
            ) if model_config else existing_agent.model_config

            chat_style_obj = ChatStyle(
                friendliness=chat_style.get("friendliness", "friendly"),
                response_length=chat_style.get("response_length", "medium"),
                personality=chat_style.get("personality", "balanced"),
                humor=chat_style.get("humor", "light"),
                expertise_level=chat_style.get("expertise_level", "expert")
            ) if chat_style else existing_agent.chat_style

            voice_config_obj = VoiceConfig(
                voice_enabled=voice_config.get("voice_enabled", False),
                voice_connection_id=voice_config.get("voice_connection_id"),
                podcast_settings=voice_config.get("podcast_settings")
            ) if voice_config else existing_agent.voice_config

            updated_agent = Agent(
                agent_id=agent_id,
                name=name,
                prompt=prompt,
                characteristics=characteristics,
                model_config=model_configuration,
                chat_style=chat_style_obj,
                connection_id=connection_id or existing_agent.connection_id,
                voice_config=voice_config_obj,
                selected_mcp_tools=mcp_tools if mcp_tools is not None else getattr(
                    existing_agent, 'selected_mcp_tools', None),
                mcp_tool_config=mcp_tool_config if mcp_tool_config is not None else getattr(
                    existing_agent, 'mcp_tool_config', None)
            )

            return agent_service.update_agent(updated_agent)

    def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        with SessionManager.get_agent_repository() as agent_repo:
            agent_service = AgentService(agent_repo)
            return agent_service.delete_agent(agent_id, user_id)

    async def agent_chat(
        self,
        agent_id: str,
        message: str,
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        with SessionManager.get_agent_repository() as agent_repo, \
                SessionManager.get_conversation_repository() as conv_repo:
            base_chat_service = ChatService(
                self._model_provider,
                agent_repo,
                conv_repo
            )
            # Use enhanced chat service for MCP tool support
            enhanced_chat_service = EnhancedChatService(base_chat_service)
            return await enhanced_chat_service.agent_chat(agent_id, message, conversation_id, user_id)

    async def multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None,
        project_id: str = None
    ) -> List[Dict[str, Any]]:
        with SessionManager.get_agent_repository() as agent_repo, \
                SessionManager.get_conversation_repository() as conv_repo:
            base_chat_service = ChatService(
                self._model_provider,
                agent_repo,
                conv_repo
            )
            # Use project-enhanced chat service for full VM access when in projects
            try:
                from ...project.application.project_service import ProjectService
                from ...project.infrastructure.project_repository import (
                    ProjectRepository,
                )

                # Create project service (simplified dependency injection)
                # In production, you'd use proper DI container
                project_repo = ProjectRepository(conv_repo.db_session)
                project_service = ProjectService(
                    project_repo=project_repo,
                    file_repo=None,  # TODO: Implement when needed
                    vm_service_repo=None,  # TODO: Implement when needed
                )

                # Use project-enhanced chat service
                enhanced_chat_service = ProjectEnhancedChatService(
                    base_chat_service, project_service
                )
                conversation_messages = await enhanced_chat_service.multi_agent_conversation(
                    conversation_id, agent_ids, initial_message, max_turns,
                    user_id, file_attachments, project_id
                )
            except ImportError:
                # Fallback to regular enhanced chat if project service not available
                enhanced_chat_service = EnhancedChatService(base_chat_service)
                conversation_messages = await enhanced_chat_service.multi_agent_conversation(
                    conversation_id, agent_ids, initial_message, max_turns, user_id, file_attachments
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
        max_turns: int = 10,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None,
        project_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        with SessionManager.get_agent_repository() as agent_repo, \
                SessionManager.get_conversation_repository() as conv_repo:
            base_chat_service = ChatService(
                self._model_provider,
                agent_repo,
                conv_repo
            )

            # Use project-enhanced chat service for streaming as well
            try:
                from ...project.application.project_service import ProjectService
                from ...project.infrastructure.project_repository import (
                    ProjectRepository,
                )

                project_repo = ProjectRepository(conv_repo.db_session)
                project_service = ProjectService(
                    project_repo=project_repo,
                    file_repo=None,
                    vm_service_repo=None,
                )

                enhanced_chat_service = ProjectEnhancedChatService(
                    base_chat_service, project_service
                )
                async for message in enhanced_chat_service.multi_agent_conversation_stream(
                    conversation_id, agent_ids, initial_message, max_turns,
                    user_id, file_attachments, project_id
                ):
                    yield message
            except ImportError:
                # Fallback to regular chat service
                async for message in base_chat_service.multi_agent_conversation_stream(
                    conversation_id, agent_ids, initial_message, max_turns, user_id, file_attachments
                ):
                    yield message

    def get_conversation_history(self, conversation_id: str, user_id: str = None) -> List[Dict[str, Any]]:
        with SessionManager.get_conversation_repository() as conv_repo:
            chat_service = ChatService(
                self._model_provider,
                None,
                conv_repo
            )
            return chat_service.get_conversation_history(conversation_id, user_id)

    def get_all_conversations(self, user_id: str = None) -> List[Dict[str, Any]]:
        """Get all conversations from database"""
        with SessionManager.get_conversation_repository() as conv_repo:
            return conv_repo.get_all_conversations(user_id)

    def get_conversation_by_id(self, conversation_id: str, user_id: str = None) -> Dict[str, Any]:
        """Get a specific conversation by ID, including shared conversations"""
        with SessionManager.get_conversation_repository() as conv_repo:
            return conv_repo.get_conversation_by_id(conversation_id, user_id)

    def update_conversation_sharing(self, conversation_id: str, is_shared: bool, user_id: str) -> bool:
        """Update the sharing status of a conversation"""
        with SessionManager.get_conversation_repository() as conv_repo:
            return conv_repo.update_conversation_sharing(conversation_id, is_shared, user_id)

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation and all its messages"""
        with SessionManager.get_conversation_repository() as conv_repo:
            return conv_repo.delete_conversation(conversation_id, user_id)

    async def simple_chat(self, message: str, user_id: str = None) -> str:
        """Simple chat without agents for utility purposes like content enhancement"""
        try:
            response = await self._model_provider.chat(message, {})
            return response
        except Exception as e:
            return f"Error processing with AI: {str(e)}"
