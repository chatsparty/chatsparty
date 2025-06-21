from typing import List, Optional
from sqlalchemy.orm import Session

from ....models.database import Agent as AgentModel, VoiceConnection as VoiceConnectionModel
from ..domain.entities import Agent, ModelConfiguration, ChatStyle, VoiceConfig
from ..domain.interfaces import AgentRepositoryInterface
from .base_repository import BaseRepository


class DatabaseAgentRepository(BaseRepository, AgentRepositoryInterface):
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create_agent(self, agent: Agent, user_id: str) -> Agent:
        def _create():
            # Validate voice connection exists if specified
            voice_connection_id = None
            if (agent.voice_config and 
                agent.voice_config.voice_enabled and 
                agent.voice_config.voice_connection_id):
                
                voice_conn = self.db_session.query(VoiceConnectionModel).filter(
                    VoiceConnectionModel.id == agent.voice_config.voice_connection_id,
                    VoiceConnectionModel.user_id == user_id,
                    VoiceConnectionModel.is_active == True
                ).first()
                
                if voice_conn:
                    voice_connection_id = agent.voice_config.voice_connection_id
                # If voice connection doesn't exist, we'll set it to None (voice disabled)
            
            db_agent = AgentModel(
                id=agent.agent_id,
                name=agent.name,
                prompt=agent.prompt,
                characteristics=agent.characteristics,
                connection_id=agent.connection_id,
                user_id=user_id,
                model_config={
                    "provider": agent.model_config.provider,
                    "model_name": agent.model_config.model_name,
                    "api_key": agent.model_config.api_key,
                    "base_url": agent.model_config.base_url,
                },
                chat_style={
                    "friendliness": agent.chat_style.friendliness,
                    "response_length": agent.chat_style.response_length,
                    "personality": agent.chat_style.personality,
                    "humor": agent.chat_style.humor,
                    "expertise_level": agent.chat_style.expertise_level,
                },
                voice_enabled=bool(voice_connection_id),  # Only enable voice if we have a valid connection
                voice_connection_id=voice_connection_id,
                podcast_settings=agent.voice_config.podcast_settings if agent.voice_config else None
            )
            
            self.db_session.add(db_agent)
            return agent
        
        return self.safe_execute(_create)
    
    def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        query = self.db_session.query(AgentModel).filter(AgentModel.id == agent_id)
        if user_id:
            query = query.filter(AgentModel.user_id == user_id)
        
        db_agent = query.first()
        
        if not db_agent:
            return None
        
        return self._to_domain_entity(db_agent)
    
    def list_agents(self, user_id: str = None) -> List[Agent]:
        query = self.db_session.query(AgentModel)
        if user_id:
            query = query.filter(AgentModel.user_id == user_id)
        
        db_agents = query.all()
        return [self._to_domain_entity(db_agent) for db_agent in db_agents]
    
    def update_agent(self, agent: Agent) -> Agent:
        db_agent = self.db_session.query(AgentModel).filter(AgentModel.id == agent.agent_id).first()
        
        if db_agent:
            db_agent.name = agent.name
            db_agent.prompt = agent.prompt
            db_agent.characteristics = agent.characteristics
            db_agent.connection_id = agent.connection_id
            db_agent.model_config = {
                "provider": agent.model_config.provider,
                "model_name": agent.model_config.model_name,
                "api_key": agent.model_config.api_key,
                "base_url": agent.model_config.base_url,
            }
            db_agent.chat_style = {
                "friendliness": agent.chat_style.friendliness,
                "response_length": agent.chat_style.response_length,
                "personality": agent.chat_style.personality,
                "humor": agent.chat_style.humor,
                "expertise_level": agent.chat_style.expertise_level,
            }
            # Validate voice connection exists if specified  
            voice_connection_id = None
            if (agent.voice_config and 
                agent.voice_config.voice_enabled and 
                agent.voice_config.voice_connection_id):
                
                voice_conn = self.db_session.query(VoiceConnectionModel).filter(
                    VoiceConnectionModel.id == agent.voice_config.voice_connection_id,
                    VoiceConnectionModel.user_id == db_agent.user_id,
                    VoiceConnectionModel.is_active == True
                ).first()
                
                if voice_conn:
                    voice_connection_id = agent.voice_config.voice_connection_id
            
            db_agent.voice_enabled = bool(voice_connection_id)
            db_agent.voice_connection_id = voice_connection_id
            db_agent.podcast_settings = agent.voice_config.podcast_settings if agent.voice_config else None
        
        return agent
    
    def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        query = self.db_session.query(AgentModel).filter(AgentModel.id == agent_id)
        if user_id:
            query = query.filter(AgentModel.user_id == user_id)
        
        db_agent = query.first()
        
        if not db_agent:
            return False
        
        self.db_session.delete(db_agent)
        return True
    
    def _to_domain_entity(self, db_agent: AgentModel) -> Agent:
        model_config = ModelConfiguration(
            provider=db_agent.model_config["provider"],
            model_name=db_agent.model_config["model_name"],
            api_key=db_agent.model_config.get("api_key"),
            base_url=db_agent.model_config.get("base_url"),
        )
        
        chat_style = ChatStyle(
            friendliness=db_agent.chat_style.get("friendliness", "friendly"),
            response_length=db_agent.chat_style.get("response_length", "medium"),
            personality=db_agent.chat_style.get("personality", "balanced"),
            humor=db_agent.chat_style.get("humor", "light"),
            expertise_level=db_agent.chat_style.get("expertise_level", "expert"),
        )
        
        voice_config = VoiceConfig(
            voice_enabled=getattr(db_agent, 'voice_enabled', False),
            voice_connection_id=getattr(db_agent, 'voice_connection_id', None),
            podcast_settings=getattr(db_agent, 'podcast_settings', None)
        )
        
        return Agent(
            agent_id=db_agent.id,
            name=db_agent.name,
            prompt=db_agent.prompt,
            characteristics=db_agent.characteristics,
            model_config=model_config,
            chat_style=chat_style,
            connection_id=db_agent.connection_id,
            voice_config=voice_config
        )