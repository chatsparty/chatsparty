from typing import List, Dict, Optional
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..ai_core.entities import Agent, ModelConfiguration, ChatStyle, VoiceConfig
from ..ai_core.interfaces import AgentRepositoryInterface
from ...models.database import Agent as AgentModel, VoiceConnection as VoiceConnectionModel


class BaseRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def safe_execute(self, operation):
        try:
            result = await operation()
            await self.db_session.commit()
            return result
        except Exception as e:
            await self.db_session.rollback()
            raise e


class DatabaseAgentRepository(BaseRepository, AgentRepositoryInterface):
    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)
    
    async def create_agent(self, agent: Agent, user_id: str) -> Agent:
        async def _create():
            voice_connection_id = None
            if (agent.voice_config and 
                agent.voice_config.voice_enabled and 
                agent.voice_config.voice_connection_id):
                
                if agent.voice_config.voice_connection_id == "chatsparty-default-voice":
                    voice_connection_id = agent.voice_config.voice_connection_id
                else:
                    stmt = select(VoiceConnectionModel).where(
                        VoiceConnectionModel.id == agent.voice_config.voice_connection_id,
                        VoiceConnectionModel.user_id == user_id,
                        VoiceConnectionModel.is_active == True
                    )
                    result = await self.db_session.exec(stmt)
                    voice_conn = result.first()
                    
                    if voice_conn:
                        voice_connection_id = agent.voice_config.voice_connection_id
            
            podcast_settings = {}
            if agent.voice_config:
                if agent.voice_config.podcast_settings:
                    podcast_settings = agent.voice_config.podcast_settings.copy()
                if agent.voice_config.selected_voice_id:
                    podcast_settings['selected_voice_id'] = agent.voice_config.selected_voice_id
            
            db_agent = AgentModel(
                id=agent.agent_id,
                name=agent.name,
                prompt=agent.prompt,
                characteristics=agent.characteristics,
                gender=agent.gender,
                connection_id=agent.connection_id,
                user_id=user_id,
                ai_config={
                    "provider": agent.ai_config.provider,
                    "model_name": agent.ai_config.model_name,
                    "api_key": agent.ai_config.api_key,
                    "base_url": agent.ai_config.base_url,
                },
                chat_style={
                    "friendliness": agent.chat_style.friendliness,
                    "response_length": agent.chat_style.response_length,
                    "personality": agent.chat_style.personality,
                    "humor": agent.chat_style.humor,
                    "expertise_level": agent.chat_style.expertise_level,
                },
                voice_enabled=bool(voice_connection_id),
                voice_connection_id=voice_connection_id,
                podcast_settings=podcast_settings if podcast_settings else None
            )
            
            self.db_session.add(db_agent)
            return agent
        
        return await self.safe_execute(_create)
    
    async def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        stmt = select(AgentModel).where(AgentModel.id == agent_id)
        if user_id:
            stmt = stmt.where(AgentModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_agent = result.first()
        
        if not db_agent:
            return None
        
        return self._to_domain_entity(db_agent)
    
    async def list_agents(self, user_id: str = None) -> List[Agent]:
        stmt = select(AgentModel)
        if user_id:
            stmt = stmt.where(AgentModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_agents = result.all()
        return [self._to_domain_entity(db_agent) for db_agent in db_agents]
    
    async def update_agent(self, agent: Agent) -> Agent:
        stmt = select(AgentModel).where(AgentModel.id == agent.agent_id)
        result = await self.db_session.exec(stmt)
        db_agent = result.first()
        
        if not db_agent:
            raise ValueError(f"Agent with id {agent.agent_id} not found")
        
        db_agent.name = agent.name
        db_agent.prompt = agent.prompt
        db_agent.characteristics = agent.characteristics
        db_agent.gender = agent.gender
        db_agent.connection_id = agent.connection_id
        db_agent.ai_config = {
            "provider": agent.ai_config.provider,
            "model_name": agent.ai_config.model_name,
            "api_key": agent.ai_config.api_key,
            "base_url": agent.ai_config.base_url,
        }
        db_agent.chat_style = {
            "friendliness": agent.chat_style.friendliness,
            "response_length": agent.chat_style.response_length,
            "personality": agent.chat_style.personality,
            "humor": agent.chat_style.humor,
            "expertise_level": agent.chat_style.expertise_level,
        }
        
        voice_connection_id = None
        if (agent.voice_config and 
            agent.voice_config.voice_enabled and 
            agent.voice_config.voice_connection_id):
            
            if agent.voice_config.voice_connection_id == "chatsparty-default-voice":
                voice_connection_id = agent.voice_config.voice_connection_id
            else:
                stmt = select(VoiceConnectionModel).where(
                    VoiceConnectionModel.id == agent.voice_config.voice_connection_id,
                    VoiceConnectionModel.user_id == db_agent.user_id,
                    VoiceConnectionModel.is_active == True
                )
                result = await self.db_session.exec(stmt)
                voice_conn = result.first()
                
                if voice_conn:
                    voice_connection_id = agent.voice_config.voice_connection_id
        
        podcast_settings = {}
        if agent.voice_config:
            if agent.voice_config.podcast_settings:
                podcast_settings = agent.voice_config.podcast_settings.copy()
            if agent.voice_config.selected_voice_id:
                podcast_settings['selected_voice_id'] = agent.voice_config.selected_voice_id
        
        db_agent.voice_enabled = bool(voice_connection_id)
        db_agent.voice_connection_id = voice_connection_id
        db_agent.podcast_settings = podcast_settings if podcast_settings else None
        
        
        # Let FastAPI handle commit/rollback
        await self.db_session.refresh(db_agent)
        
        return agent
    
    async def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        stmt = select(AgentModel).where(AgentModel.id == agent_id)
        if user_id:
            stmt = stmt.where(AgentModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_agent = result.first()
        
        if not db_agent:
            return False
        
        await self.db_session.delete(db_agent)
        return True
    
    def _to_domain_entity(self, db_agent: AgentModel) -> Agent:
        model_config = ModelConfiguration(
            provider=db_agent.ai_config["provider"],
            model_name=db_agent.ai_config["model_name"],
            api_key=db_agent.ai_config.get("api_key"),
            base_url=db_agent.ai_config.get("base_url"),
        )
        
        chat_style = ChatStyle(
            friendliness=db_agent.chat_style.get("friendliness", "friendly"),
            response_length=db_agent.chat_style.get("response_length", "medium"),
            personality=db_agent.chat_style.get("personality", "balanced"),
            humor=db_agent.chat_style.get("humor", "light"),
            expertise_level=db_agent.chat_style.get("expertise_level", "expert"),
        )
        
        podcast_settings = getattr(db_agent, 'podcast_settings', {}) or {}
        selected_voice_id = None
        if isinstance(podcast_settings, dict):
            selected_voice_id = podcast_settings.get('selected_voice_id')
            podcast_settings_clean = {k: v for k, v in podcast_settings.items() if k != 'selected_voice_id'}
        else:
            podcast_settings_clean = podcast_settings
        
        voice_config = VoiceConfig(
            voice_enabled=getattr(db_agent, 'voice_enabled', False),
            voice_connection_id=getattr(db_agent, 'voice_connection_id', None),
            selected_voice_id=selected_voice_id,
            podcast_settings=podcast_settings_clean if podcast_settings_clean else None
        )
        
        return Agent(
            agent_id=db_agent.id,
            name=db_agent.name,
            prompt=db_agent.prompt,
            characteristics=db_agent.characteristics,
            ai_config=model_config,
            chat_style=chat_style,
            connection_id=db_agent.connection_id,
            gender=getattr(db_agent, 'gender', 'neutral'),
            voice_config=voice_config,
        )