from typing import List, Dict, Any, Optional
import aiohttp
from .base_voice_provider import BaseVoiceProvider
from ...domain.entities import VoiceConnection, VoiceGenerationResult, VoiceConnectionTestResult


class ElevenLabsProvider(BaseVoiceProvider):
    """ElevenLabs TTS provider implementation"""
    
    def get_provider_name(self) -> str:
        return "elevenlabs"
    
    def get_supported_provider_types(self) -> List[str]:
        return ["tts"]  # ElevenLabs only supports TTS
    
    def requires_api_key(self) -> bool:
        return True
    
    def get_default_base_url(self) -> Optional[str]:
        return "https://api.elevenlabs.io/v1"
    
    def _get_headers(self, voice_connection: VoiceConnection) -> Dict[str, str]:
        """Get headers for ElevenLabs API requests"""
        return {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": voice_connection.api_key
        }
    
    def _get_base_url(self, voice_connection: VoiceConnection) -> str:
        """Get base URL for API requests"""
        return voice_connection.base_url or self.get_default_base_url()
    
    async def text_to_speech(
        self,
        text: str,
        voice_connection: VoiceConnection
    ) -> VoiceGenerationResult:
        """Convert text to speech using ElevenLabs API"""
        
        # Validate connection
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return self._create_error_result(f"Invalid connection: {', '.join(validation['errors'])}")
        
        # Prepare request
        base_url = self._get_base_url(voice_connection)
        voice_id = voice_connection.voice_id or "21m00Tcm4TlvDq8ikWAM"  # Default voice
        url = f"{base_url}/text-to-speech/{voice_id}"
        
        headers = self._get_headers(voice_connection)
        
        # ElevenLabs API payload
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": voice_connection.stability,
                "similarity_boost": voice_connection.clarity,
                "style": 0.0,  # ElevenLabs doesn't have direct style mapping
                "use_speaker_boost": True
            }
        }
        
        try:
            session = await self._get_session()
            
            async with session.post(
                url=url,
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)  # Longer timeout for TTS
            ) as response:
                
                if response.status == 200:
                    audio_data = await response.read()
                    
                    return self._create_success_result(
                        audio_data=audio_data,
                        file_size_bytes=len(audio_data),
                        metadata={
                            "provider": "elevenlabs",
                            "voice_id": voice_id,
                            "model": "eleven_monolingual_v1"
                        }
                    )
                else:
                    error_text = await response.text()
                    return self._create_error_result(
                        f"ElevenLabs API error ({response.status}): {error_text}"
                    )
        
        except Exception as e:
            return self._create_error_result(f"ElevenLabs TTS failed: {str(e)}")
    
    async def speech_to_text(
        self,
        audio_data: bytes,
        voice_connection: VoiceConnection
    ) -> str:
        """ElevenLabs doesn't support STT"""
        _ = audio_data, voice_connection  # Unused parameters
        raise NotImplementedError("ElevenLabs does not support speech-to-text")
    
    async def test_connection(
        self,
        voice_connection: VoiceConnection
    ) -> VoiceConnectionTestResult:
        """Test ElevenLabs connection by fetching user info"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Connection validation failed: {', '.join(validation['errors'])}"
            )
        
        base_url = self._get_base_url(voice_connection)
        url = f"{base_url}/user"
        
        headers = {
            "Accept": "application/json",
            "xi-api-key": voice_connection.api_key
        }
        
        try:
            response = await self._make_request("GET", url, headers=headers)
            
            if response["success"]:
                user_data = response["data"]
                subscription = user_data.get("subscription", {})
                
                return VoiceConnectionTestResult(
                    success=True,
                    message="ElevenLabs connection successful",
                    details={
                        "api_status": "valid",
                        "user_verified": True
                    },
                    provider_info={
                        "provider": "elevenlabs",
                        "subscription_tier": subscription.get("tier", "unknown"),
                        "character_count": subscription.get("character_count", 0),
                        "character_limit": subscription.get("character_limit", 0),
                        "supported_features": {
                            "tts": True,
                            "stt": False
                        },
                        "base_url": base_url
                    }
                )
            else:
                return VoiceConnectionTestResult(
                    success=False,
                    message=f"ElevenLabs connection failed: {response.get('error', 'Unknown error')}"
                )
        
        except Exception as e:
            return VoiceConnectionTestResult(
                success=False,
                message=f"ElevenLabs connection test failed: {str(e)}"
            )
    
    async def get_available_voices(
        self,
        voice_connection: VoiceConnection
    ) -> List[Dict[str, Any]]:
        """Get available voices from ElevenLabs"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return []
        
        base_url = self._get_base_url(voice_connection)
        url = f"{base_url}/voices"
        
        headers = {
            "Accept": "application/json",
            "xi-api-key": voice_connection.api_key
        }
        
        try:
            response = await self._make_request("GET", url, headers=headers)
            
            if response["success"]:
                voices_data = response["data"]
                voices = []
                
                for voice in voices_data.get("voices", []):
                    voices.append({
                        "id": voice.get("voice_id"),
                        "name": voice.get("name"),
                        "description": voice.get("description", ""),
                        "category": voice.get("category", "generated"),
                        "gender": voice.get("labels", {}).get("gender", "unknown"),
                        "age": voice.get("labels", {}).get("age", "unknown"),
                        "accent": voice.get("labels", {}).get("accent", "unknown"),
                        "preview_url": voice.get("preview_url"),
                        "available_for_tiers": voice.get("available_for_tiers", [])
                    })
                
                return voices
            else:
                return []
        
        except Exception:
            return []
    
    async def generate_voice_sample(
        self,
        text: str,
        voice_connection: VoiceConnection,
        sample_text: Optional[str] = None
    ) -> VoiceGenerationResult:
        """Generate a voice sample for testing"""
        
        test_text = sample_text or text or "Hello, this is a test of the voice synthesis."
        
        # Limit sample text length to avoid excessive API usage
        if len(test_text) > 100:
            test_text = test_text[:100] + "..."
        
        return await self.text_to_speech(test_text, voice_connection)
    
    async def generate_tts(self, voice_connection: VoiceConnection, text: str) -> VoiceConnectionTestResult:
        """Generate TTS audio and return as VoiceConnectionTestResult for compatibility"""
        result = await self.text_to_speech(text, voice_connection)
        
        return VoiceConnectionTestResult(
            success=result.success,
            message=result.error_message or "TTS generated successfully",
            audio_data=result.audio_data,
            details=result.metadata
        )