from typing import List, Dict, Any, Optional
import uuid
from sqlalchemy.orm import Session
from ..domain.entities import Agent, ModelConfiguration, ChatStyle, VoiceConfig
from ..domain.interfaces import AgentRepositoryInterface
from ....models.database import VoiceConnection as VoiceConnectionModel


class AgentService:
    def __init__(self, agent_repository: AgentRepositoryInterface):
        self._agent_repository = agent_repository
    
    def create_agent(
        self, 
        name: str, 
        prompt: str, 
        characteristics: str,
        user_id: str,
        model_config: Optional[Dict] = None,
        chat_style: Optional[Dict] = None,
        connection_id: Optional[str] = None,
        voice_config: Optional[Dict] = None
    ) -> Agent:
        model_configuration = ModelConfiguration(
            provider=model_config.get("provider", "ollama"),
            model_name=model_config.get("model_name", "gemma3:4b"),
            api_key=model_config.get("api_key"),
            base_url=model_config.get("base_url")
        ) if model_config else ModelConfiguration(
            provider="ollama",
            model_name="gemma3:4b"
        )
        
        chat_style_obj = ChatStyle(
            friendliness=chat_style.get("friendliness", "friendly"),
            response_length=chat_style.get("response_length", "medium"),
            personality=chat_style.get("personality", "balanced"),
            humor=chat_style.get("humor", "light"),
            expertise_level=chat_style.get("expertise_level", "expert")
        ) if chat_style else ChatStyle()
        
        voice_config_obj = VoiceConfig(
            voice_enabled=voice_config.get("voice_enabled", False),
            voice_connection_id=voice_config.get("voice_connection_id"),
            podcast_settings=voice_config.get("podcast_settings")
        ) if voice_config else VoiceConfig()
        
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
            voice_config=voice_config_obj
        )
        
        return self._agent_repository.create_agent(agent, user_id)
    
    def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        return self._agent_repository.get_agent(agent_id, user_id)
    
    def list_agents(self, user_id: str = None) -> List[Dict[str, Any]]:
        agents = self._agent_repository.list_agents(user_id)
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "prompt": agent.prompt,
                "characteristics": agent.characteristics,
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
                    "podcast_settings": agent.voice_config.podcast_settings if agent.voice_config else None
                } if agent.voice_config else None
            }
            for agent in agents
        ]
    
    def update_agent(self, agent: Agent) -> Agent:
        return self._agent_repository.update_agent(agent)
    
    def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        return self._agent_repository.delete_agent(agent_id, user_id)