from typing import List, Dict, Any, Optional
import base64
import logging
from ..base_voice_provider import BaseVoiceProvider
from ....domain.entities import VoiceConnection, VoiceGenerationResult, VoiceConnectionTestResult
from .config import GoogleCloudConfig
from .http_client import GoogleCloudHttpClient
from .voice_mapper import VoiceMapper
from .audio_processor import AudioProcessor

logger = logging.getLogger(__name__)


class GoogleCloudProvider(BaseVoiceProvider):
    """Google Cloud Text-to-Speech provider implementation"""
    
    def __init__(self):
        super().__init__()
        self.config = GoogleCloudConfig()
        self.http_client = GoogleCloudHttpClient()
        self.voice_mapper = VoiceMapper()
        self.audio_processor = AudioProcessor()
        self.provider_name = self.config.PROVIDER_NAME
        self.supported_voice_types = self.config.SUPPORTED_VOICE_TYPES
    
    def get_provider_name(self) -> str:
        """Get the provider name"""
        return self.config.PROVIDER_NAME
    
    def get_supported_provider_types(self) -> List[str]:
        """Get supported provider types"""
        return self.config.SUPPORTED_PROVIDER_TYPES
    
    def requires_api_key(self) -> bool:
        """Whether this provider requires an API key"""
        return True
    
    def get_default_base_url(self) -> Optional[str]:
        """Get default base URL for this provider"""
        return self.config.DEFAULT_BASE_URL
    
    def validate_connection(self, voice_connection: VoiceConnection) -> Dict[str, Any]:
        """Validate Google Cloud TTS connection parameters"""
        errors = []
        
        if not voice_connection.api_key:
            errors.append("API key is required for Google Cloud TTS")
        
        if not voice_connection.voice_id:
            errors.append("Voice ID is required (e.g., 'en-US-Neural2-A')")
        
        # Validate voice ID format (should contain language code and voice name)
        if voice_connection.voice_id and "-" not in voice_connection.voice_id:
            errors.append("Invalid voice ID format. Expected format: 'language-Country-VoiceType-Letter' (e.g., 'en-US-Neural2-A')")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    async def text_to_speech(
        self,
        text: str,
        voice_connection: VoiceConnection
    ) -> VoiceGenerationResult:
        """Generate speech from text using Google Cloud TTS"""
        
        # Check for empty text
        if not text or not text.strip():
            logger.warning("Empty text provided for TTS generation")
            return VoiceGenerationResult(
                success=False,
                audio_data=None,
                audio_url=None,
                duration_seconds=None,
                file_size_bytes=None,
                error_message="No text provided for TTS generation"
            )
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return VoiceGenerationResult(
                success=False,
                audio_data=None,
                audio_url=None,
                duration_seconds=None,
                file_size_bytes=None,
                error_message=f"Invalid connection: {', '.join(validation['errors'])}"
            )
        
        base_url = self.http_client.get_base_url(voice_connection.base_url)
        url = f"{base_url}/text:synthesize"
        
        headers = self.http_client.get_headers(voice_connection.api_key)
        
        language_code, voice_name = self.voice_mapper.map_voice_id(voice_connection.voice_id)
        audio_config = self.voice_mapper.map_parameters(voice_connection)
        
        request_data = {
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": language_code,
                "name": voice_name
            },
            "audioConfig": audio_config
        }
        
        logger.info(f"Generating TTS for text (length: {len(text)}) with voice {voice_name} ({language_code})")
        logger.info(f"Audio config: speakingRate={audio_config.get('speakingRate', 1.0)}, pitch={audio_config.get('pitch', 0.0)}, sampleRate={audio_config.get('sampleRateHertz', 44100)}Hz, volumeGain={audio_config.get('volumeGainDb', 0.0)}dB")
        logger.debug(f"Text preview: {text[:100]}...")
        
        try:
            response = await self.http_client.make_request("POST", url, headers, request_data)
            
            if response["success"]:
                response_data = response.get("data", {})
                logger.debug(f"Google TTS response keys: {list(response_data.keys())}")
                
                audio_content = response_data.get("audioContent", "")
                if audio_content:
                    logger.debug(f"Received audio content: {len(audio_content)} chars (base64)")
                    
                    # Decode base64 audio content
                    try:
                        audio_data = base64.b64decode(audio_content)
                        logger.info(f"Successfully decoded {len(audio_data)} bytes of audio data")
                    except Exception as e:
                        logger.error(f"Failed to decode base64 audio content: {e}")
                        return VoiceGenerationResult(
                            success=False,
                            audio_data=None,
                            audio_url=None,
                            duration_seconds=None,
                            file_size_bytes=None,
                            error_message=f"Failed to decode audio content: {str(e)}"
                        )
                    
                    # Validate PCM data
                    if not self.audio_processor.validate_pcm_data(audio_data):
                        return VoiceGenerationResult(
                            success=False,
                            audio_data=None,
                            audio_url=None,
                            duration_seconds=None,
                            file_size_bytes=None,
                            error_message="Invalid PCM audio data received"
                        )
                    
                    # Wrap LINEAR16 PCM data in WAV format
                    sample_rate = audio_config.get("sampleRateHertz", self.config.DEFAULT_SAMPLE_RATE)
                    wav_data, format_type = self.audio_processor.wrap_pcm_in_wav(audio_data, sample_rate)
                    
                    return VoiceGenerationResult(
                        success=True,
                        audio_data=wav_data,
                        audio_url=None,
                        duration_seconds=None,
                        file_size_bytes=len(wav_data),
                        error_message=None,
                        metadata={
                            "provider": self.config.PROVIDER_NAME,
                            "voice": voice_name,
                            "language": language_code,
                            "format": format_type,
                            "encoding": self.config.DEFAULT_AUDIO_ENCODING,
                            "sample_rate": sample_rate
                        }
                    )
                else:
                    logger.error(f"No audio content in Google TTS response. Full response: {response_data}")
                    return VoiceGenerationResult(
                        success=False,
                        audio_data=None,
                        audio_url=None,
                        duration_seconds=None,
                        file_size_bytes=None,
                        error_message="No audio content in response"
                    )
            else:
                return VoiceGenerationResult(
                    success=False,
                    audio_data=None,
                    audio_url=None,
                    duration_seconds=None,
                    file_size_bytes=None,
                    error_message=f"Google Cloud TTS error: {response.get('error', 'Unknown error')}"
                )
        
        except Exception as e:
            return VoiceGenerationResult(
                success=False,
                audio_data=None,
                audio_url=None,
                duration_seconds=None,
                file_size_bytes=None,
                error_message=f"Failed to generate speech: {str(e)}"
            )
    
    async def test_connection(
        self,
        voice_connection: VoiceConnection
    ) -> VoiceConnectionTestResult:
        """Test Google Cloud TTS connection"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Invalid configuration: {', '.join(validation['errors'])}"
            )
        
        base_url = self.http_client.get_base_url(voice_connection.base_url)
        url = f"{base_url}/voices"
        
        headers = self.http_client.get_headers(voice_connection.api_key)
        
        try:
            response = await self.http_client.make_request("GET", url, headers=headers)
            
            if response["success"]:
                voices_data = response["data"]
                voice_count = len(voices_data.get("voices", []))
                
                return VoiceConnectionTestResult(
                    success=True,
                    message=f"Google Cloud TTS connection successful. Found {voice_count} available voices.",
                    details={
                        "api_status": "valid",
                        "voices_available": voice_count > 0
                    },
                    provider_info={
                        "provider": self.config.PROVIDER_NAME,
                        "service": "Cloud Text-to-Speech",
                        "supported_features": {
                            "tts": True,
                            "stt": False,
                            "multiple_languages": True,
                            "neural_voices": True,
                            "wavenet_voices": True,
                            "standard_voices": True
                        },
                        "base_url": base_url,
                        "available_voices": voice_count
                    }
                )
            else:
                return VoiceConnectionTestResult(
                    success=False,
                    message=f"Google Cloud TTS connection failed: {response.get('error', 'Unknown error')}"
                )
        
        except Exception as e:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Google Cloud TTS connection test failed: {str(e)}"
            )
    
    async def get_available_voices(
        self,
        voice_connection: VoiceConnection
    ) -> List[Dict[str, Any]]:
        """Get available voices from Google Cloud TTS"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return []
        
        base_url = self.http_client.get_base_url(voice_connection.base_url)
        url = f"{base_url}/voices"
        
        headers = self.http_client.get_headers(voice_connection.api_key)
        
        try:
            logger.info(f"Fetching voices from Google Cloud TTS: {url}")
            response = await self.http_client.make_request("GET", url, headers=headers)
            
            if response["success"]:
                voices_data = response["data"]
                return self.voice_mapper.process_voices_response(voices_data)
            else:
                logger.error(f"Failed to get voices from Google Cloud TTS: {response.get('error', 'Unknown error')}")
                return []
        
        except Exception as e:
            logger.error(f"Failed to get available voices: {str(e)}", exc_info=True)
            return []
    
    async def generate_voice_sample(
        self,
        text: str,
        voice_connection: VoiceConnection
    ) -> VoiceGenerationResult:
        """Generate a voice sample (same as text_to_speech for Google)"""
        return await self.text_to_speech(text, voice_connection)
    
    async def generate_tts(
        self,
        voice_connection: VoiceConnection,
        text: str
    ) -> VoiceGenerationResult:
        """Alias for text_to_speech to match voice service interface"""
        return await self.text_to_speech(text, voice_connection)
    
    async def speech_to_text(
        self,
        audio_data: bytes,
        voice_connection: VoiceConnection
    ) -> str:
        """Convert speech audio to text - Not supported by Google Cloud TTS"""
        raise NotImplementedError("Google Cloud Text-to-Speech does not support speech-to-text. Use Google Cloud Speech-to-Text API instead.")