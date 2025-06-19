from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from .entities import VoiceConnection, VoiceGenerationRequest, VoiceGenerationResult


class VoiceProviderInterface(ABC):
    """Abstract base class for voice providers (TTS/STT)"""
    
    @abstractmethod
    async def text_to_speech(
        self,
        text: str,
        voice_connection: VoiceConnection
    ) -> VoiceGenerationResult:
        """Convert text to speech audio"""
        pass
    
    @abstractmethod
    async def speech_to_text(
        self,
        audio_data: bytes,
        voice_connection: VoiceConnection
    ) -> str:
        """Convert speech audio to text"""
        pass
    
    @abstractmethod
    async def test_connection(
        self,
        voice_connection: VoiceConnection
    ) -> Dict[str, Any]:
        """Test the voice connection"""
        pass
    
    @abstractmethod
    async def get_available_voices(
        self,
        voice_connection: VoiceConnection
    ) -> List[Dict[str, Any]]:
        """Get list of available voices for this provider"""
        pass


class VoiceConnectionRepositoryInterface(ABC):
    """Repository interface for voice connections"""
    
    @abstractmethod
    async def create_voice_connection(
        self,
        voice_connection: VoiceConnection,
        user_id: str
    ) -> VoiceConnection:
        pass
    
    @abstractmethod
    async def get_voice_connection(
        self,
        connection_id: str,
        user_id: str = None
    ) -> Optional[VoiceConnection]:
        pass
    
    @abstractmethod
    async def list_voice_connections(
        self,
        user_id: str = None
    ) -> List[VoiceConnection]:
        pass
    
    @abstractmethod
    async def update_voice_connection(
        self,
        voice_connection: VoiceConnection
    ) -> VoiceConnection:
        pass
    
    @abstractmethod
    async def delete_voice_connection(
        self,
        connection_id: str,
        user_id: str = None
    ) -> bool:
        pass


class PodcastGeneratorInterface(ABC):
    """Interface for podcast generation"""
    
    @abstractmethod
    async def generate_podcast(
        self,
        conversation_id: str,
        agents_voice_config: Dict[str, VoiceConnection],
        podcast_settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a podcast from a conversation"""
        pass
    
    @abstractmethod
    async def generate_podcast_stream(
        self,
        conversation_id: str,
        agents_voice_config: Dict[str, VoiceConnection],
        podcast_settings: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate a podcast with streaming progress updates"""
        pass


class VoiceServiceInterface(ABC):
    """Main voice service interface"""
    
    @abstractmethod
    async def create_voice_connection(
        self,
        connection_data: Dict[str, Any],
        user_id: str
    ) -> VoiceConnection:
        pass
    
    @abstractmethod
    async def test_voice_connection(
        self,
        connection_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    async def generate_voice_sample(
        self,
        connection_id: str,
        sample_text: str,
        user_id: str
    ) -> VoiceGenerationResult:
        pass
    
    @abstractmethod
    async def generate_conversation_podcast(
        self,
        conversation_id: str,
        podcast_settings: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        pass