"""Message processing for podcast generation."""
import logging
from typing import List, Dict, Any

from ...core.database import db_manager
from ...models.database import Message, Agent, VoiceConnection
from ...core.config import settings

logger = logging.getLogger(__name__)


class MessageProcessor:
    """Handles message retrieval and processing for podcast generation."""
    
    def get_conversation_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get conversation messages with agent voice configuration."""
        with db_manager.get_sync_session() as session:
            messages = session.query(Message).join(
                Agent, Message.agent_id == Agent.id, isouter=True
            ).join(
                VoiceConnection, Agent.voice_connection_id == VoiceConnection.id, isouter=True
            ).filter(
                Message.conversation_id == conversation_id,
                Message.role == "assistant"
            ).order_by(Message.created_at).all()
            
            result = []
            for msg in messages:
                agent = session.query(Agent).filter(Agent.id == msg.agent_id).first()
                voice_connection = None
                
                voice_connection_id = None
                if agent:
                    voice_connection_id = getattr(agent, 'voice_connection_id', None)
                
                if voice_connection_id:
                    if voice_connection_id == "chatsparty-default-voice":
                        voice_connection = self._create_default_voice_connection()
                    else:
                        voice_connection = session.query(VoiceConnection).filter(
                            VoiceConnection.id == voice_connection_id
                        ).first()
                
                result.append({
                    "id": msg.id,
                    "content": msg.content,
                    "speaker": msg.speaker or (agent.name if agent else "Unknown"),
                    "agent_id": msg.agent_id,
                    "agent": agent,
                    "voice_connection": voice_connection,
                    "language": getattr(msg, 'language', 'en')
                })
            
            return result
    
    def _create_default_voice_connection(self):
        """Create a mock voice connection object for the default ChatsParty voice."""
        class MockVoiceConnection:
            def __init__(self):
                self.id = "chatsparty-default-voice"
                self.name = "ChatsParty Default Voice"
                self.description = f"Default ChatsParty voice connection with {settings.chatsparty_default_voice_provider}"
                self.provider = settings.chatsparty_default_voice_provider
                self.provider_type = "tts"
                self.voice_id = settings.chatsparty_default_voice_id
                self.speed = 1.0
                self.pitch = 1.0
                self.stability = 0.75
                self.clarity = 0.8
                self.style = "conversational"
                self.api_key = settings.chatsparty_default_voice_api_key
                self.api_key_encrypted = False
                self.base_url = settings.chatsparty_default_voice_base_url
                self.is_active = True
                self.is_cloud_proxy = False
                self.user_id = "system"
                self.created_at = None
                self.updated_at = None
        
        return MockVoiceConnection()