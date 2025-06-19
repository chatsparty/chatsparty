from .domain.entities import VoiceConnection, VoiceConnectionTestResult
from .infrastructure.providers.elevenlabs_provider import ElevenLabsProvider
from .infrastructure.providers.openai_voice_provider import OpenAIVoiceProvider


class VoiceService:
    """Application service for voice operations"""
    
    def __init__(self):
        self.providers = {
            "elevenlabs": ElevenLabsProvider(),
            "openai": OpenAIVoiceProvider(),
        }
    
    async def test_voice_connection(self, voice_connection: VoiceConnection) -> VoiceConnectionTestResult:
        """Test a voice connection by making actual API calls"""
        provider = self.providers.get(voice_connection.provider.lower())
        
        if not provider:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Unsupported voice provider: {voice_connection.provider}",
                details={"supported_providers": list(self.providers.keys())}
            )
        
        if not voice_connection.is_active:
            return VoiceConnectionTestResult(
                success=False,
                message="Voice connection is inactive"
            )
        
        if voice_connection.is_cloud_proxy:
            # For cloud proxy connections (like ChatsParty), we might just validate the configuration
            return VoiceConnectionTestResult(
                success=True,
                message="Cloud proxy connection configured correctly",
                details={"provider": voice_connection.provider, "proxy": True}
            )
        
        # Test the provider
        try:
            test_result = await provider.test_connection(voice_connection)
            return test_result
        except Exception as e:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Connection test failed: {str(e)}",
                details={"error_type": type(e).__name__}
            )
    
    async def generate_tts(self, voice_connection: VoiceConnection, text: str):
        """Generate text-to-speech audio using the voice connection"""
        provider = self.providers.get(voice_connection.provider.lower())
        
        if not provider:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Unsupported voice provider: {voice_connection.provider}",
                audio_data=None
            )
        
        if not voice_connection.is_active:
            return VoiceConnectionTestResult(
                success=False,
                message="Voice connection is inactive",
                audio_data=None
            )
        
        # Check if provider supports TTS
        if not hasattr(provider, 'generate_tts'):
            return VoiceConnectionTestResult(
                success=False,
                message=f"Provider {voice_connection.provider} does not support TTS generation",
                audio_data=None
            )
        
        try:
            # Generate TTS using the provider
            tts_result = await provider.generate_tts(voice_connection, text)
            return tts_result
        except Exception as e:
            return VoiceConnectionTestResult(
                success=False,
                message=f"TTS generation failed: {str(e)}",
                audio_data=None
            )