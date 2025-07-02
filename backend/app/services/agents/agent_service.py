from typing import List, Dict, Any, Optional
import uuid
from ..ai_core.entities import Agent, ModelConfiguration, ChatStyle, VoiceConfig
from ..ai_core.interfaces import AgentRepositoryInterface


class AgentService:
    """Service layer for agent business logic and orchestration"""
    def __init__(self, agent_repository: AgentRepositoryInterface):
        self._agent_repository = agent_repository
    
    def create_agent(
        self, 
        name: str, 
        prompt: str, 
        characteristics: str,
        user_id: str,
        gender: str = "neutral",
        model_config: Optional[Dict] = None,
        chat_style: Optional[Dict] = None,
        connection_id: Optional[str] = None,
        voice_config: Optional[Dict] = None,
        mcp_tools: Optional[List[str]] = None,
        mcp_tool_config: Optional[Dict] = None
    ) -> Agent:
        """Create agent with business logic validations and defaults"""
        # Apply business rules for model configuration
        model_configuration = self._build_model_configuration(model_config)
        
        # Apply business rules for chat style
        chat_style_obj = self._build_chat_style(chat_style)
        
        # Apply business rules for voice configuration
        voice_config_obj = self._build_voice_config(voice_config)
        
        # Generate a unique UUID for the agent
        agent_id = str(uuid.uuid4())
        
        agent = Agent(
            agent_id=agent_id,
            name=name,
            prompt=prompt,
            characteristics=characteristics,
            model_config=model_configuration,
            chat_style=chat_style_obj,
            connection_id=connection_id or "default",
            gender=gender,
            voice_config=voice_config_obj,
            selected_mcp_tools=mcp_tools,
            mcp_tool_config=mcp_tool_config
        )
        
        return self._agent_repository.create_agent(agent, user_id)
    
    def list_agents_formatted(self, user_id: str = None) -> List[Dict[str, Any]]:
        """List agents with formatted output for API responses"""
        agents = self._agent_repository.list_agents(user_id)
        return [self._format_agent_response(agent) for agent in agents]
    
    def _build_model_configuration(self, model_config: Optional[Dict]) -> ModelConfiguration:
        """Build model configuration with defaults and validation"""
        if not model_config:
            return ModelConfiguration(provider="ollama", model_name="gemma3:4b")
        
        return ModelConfiguration(
            provider=model_config.get("provider", "ollama"),
            model_name=model_config.get("model_name", "gemma3:4b"),
            api_key=model_config.get("api_key"),
            base_url=model_config.get("base_url")
        )
    
    def _build_chat_style(self, chat_style: Optional[Dict]) -> ChatStyle:
        """Build chat style with defaults and validation"""
        if not chat_style:
            return ChatStyle()
        
        return ChatStyle(
            friendliness=chat_style.get("friendliness", "friendly"),
            response_length=chat_style.get("response_length", "medium"),
            personality=chat_style.get("personality", "balanced"),
            humor=chat_style.get("humor", "light"),
            expertise_level=chat_style.get("expertise_level", "expert")
        )
    
    def _build_voice_config(self, voice_config: Optional[Dict]) -> VoiceConfig:
        """Build voice configuration with defaults and validation"""
        if not voice_config:
            return VoiceConfig()
        
        return VoiceConfig(
            voice_enabled=voice_config.get("voice_enabled", False),
            voice_connection_id=voice_config.get("voice_connection_id"),
            selected_voice_id=voice_config.get("selected_voice_id"),
            podcast_settings=voice_config.get("podcast_settings")
        )
    
    def _format_agent_response(self, agent: Agent) -> Dict[str, Any]:
        """Format agent entity for API response"""
        return {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "prompt": agent.prompt,
            "characteristics": agent.characteristics,
            "gender": getattr(agent, 'gender', 'neutral'),
            "connection_id": agent.connection_id,
            "model_configuration": {
                "provider": agent.model_config.provider,
                "model_name": agent.model_config.model_name,
                "api_key": agent.model_config.api_key,
                "base_url": agent.model_config.base_url
            },
            "chat_style": {
                "friendliness": agent.chat_style.friendliness,
                "response_length": agent.chat_style.response_length,
                "personality": agent.chat_style.personality,
                "humor": agent.chat_style.humor,
                "expertise_level": agent.chat_style.expertise_level
            },
            "voice_config": {
                "voice_enabled": agent.voice_config.voice_enabled if agent.voice_config else False,
                "voice_connection_id": agent.voice_config.voice_connection_id if agent.voice_config else None,
                "selected_voice_id": agent.voice_config.selected_voice_id if agent.voice_config else None,
                "podcast_settings": agent.voice_config.podcast_settings if agent.voice_config else None
            } if agent.voice_config else None,
            "selected_mcp_tools": agent.selected_mcp_tools,
            "mcp_tool_config": agent.mcp_tool_config
        }