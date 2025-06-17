from typing import List, Dict, Any, Optional
from ..domain.entities import Agent, ModelConfiguration, ChatStyle
from ..domain.interfaces import AgentRepositoryInterface


class AgentService:
    def __init__(self, agent_repository: AgentRepositoryInterface):
        self._agent_repository = agent_repository
    
    def create_agent(
        self, 
        agent_id: str, 
        name: str, 
        prompt: str, 
        characteristics: str,
        model_config: Optional[Dict] = None,
        chat_style: Optional[Dict] = None,
        connection_id: Optional[str] = None
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
        
        agent = Agent(
            agent_id=agent_id,
            name=name,
            prompt=prompt,
            characteristics=characteristics,
            model_config=model_configuration,
            chat_style=chat_style_obj,
            connection_id=connection_id or "default"
        )
        
        return self._agent_repository.create_agent(agent)
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self._agent_repository.get_agent(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        agents = self._agent_repository.list_agents()
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
                }
            }
            for agent in agents
        ]
    
    def update_agent(self, agent: Agent) -> Agent:
        return self._agent_repository.update_agent(agent)
    
    def delete_agent(self, agent_id: str) -> bool:
        return self._agent_repository.delete_agent(agent_id)