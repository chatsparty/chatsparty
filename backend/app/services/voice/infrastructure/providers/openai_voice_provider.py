from typing import List, Dict, Any, Optional
import aiohttp
import json
import io
from .base_voice_provider import BaseVoiceProvider
from ...domain.entities import VoiceConnection, VoiceGenerationResult, VoiceConnectionTestResult


class OpenAIVoiceProvider(BaseVoiceProvider):
    """OpenAI TTS and STT provider implementation"""
    
    # OpenAI available voices
    AVAILABLE_VOICES = [
        {"id": "alloy", "name": "Alloy", "description": "Neutral, balanced voice"},
        {"id": "echo", "name": "Echo", "description": "Male voice with slight echo"},
        {"id": "fable", "name": "Fable", "description": "Storytelling voice"},
        {"id": "onyx", "name": "Onyx", "description": "Deep male voice"},
        {"id": "nova", "name": "Nova", "description": "Young female voice"},
        {"id": "shimmer", "name": "Shimmer", "description": "Soft female voice"}
    ]
    
    def get_provider_name(self) -> str:
        return "openai"
    
    def get_supported_provider_types(self) -> List[str]:
        return ["tts", "stt", "both"]
    
    def requires_api_key(self) -> bool:
        return True
    
    def get_default_base_url(self) -> Optional[str]:
        return "https://api.openai.com/v1"
    
    def _get_headers(self, voice_connection: VoiceConnection) -> Dict[str, str]:
        """Get headers for OpenAI API requests"""
        return {
            "Authorization": f"Bearer {voice_connection.api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_base_url(self, voice_connection: VoiceConnection) -> str:
        """Get base URL for API requests"""
        return voice_connection.base_url or self.get_default_base_url()
    
    def _map_voice_settings(self, voice_connection: VoiceConnection) -> Dict[str, Any]:
        """Map voice connection settings to OpenAI parameters"""
        # OpenAI TTS has limited customization compared to ElevenLabs
        # We'll use the voice_id and speed, other settings are informational
        return {
            "voice": voice_connection.voice_id or "alloy",
            "speed": max(0.25, min(4.0, voice_connection.speed)),  # OpenAI speed range is 0.25-4.0
            "model": "tts-1" if voice_connection.style == "conversational" else "tts-1-hd"
        }
    
    async def text_to_speech(
        self,
        text: str,
        voice_connection: VoiceConnection
    ) -> VoiceGenerationResult:
        """Convert text to speech using OpenAI TTS API"""
        
        # Validate connection
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return self._create_error_result(f"Invalid connection: {', '.join(validation['errors'])}")
        
        if voice_connection.provider_type not in ["tts", "both"]:
            return self._create_error_result("This voice connection doesn't support TTS")
        
        # Prepare request
        base_url = self._get_base_url(voice_connection)
        url = f"{base_url}/audio/speech"
        
        headers = self._get_headers(voice_connection)
        voice_settings = self._map_voice_settings(voice_connection)
        
        payload = {
            "model": voice_settings["model"],
            "input": text,
            "voice": voice_settings["voice"],
            "speed": voice_settings["speed"],
            "response_format": "mp3"
        }
        
        try:
            session = await self._get_session()
            
            async with session.post(
                url=url,
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                
                if response.status == 200:
                    audio_data = await response.read()
                    
                    return self._create_success_result(
                        audio_data=audio_data,
                        file_size_bytes=len(audio_data),
                        metadata={
                            "provider": "openai",
                            "model": voice_settings["model"],
                            "voice": voice_settings["voice"],
                            "speed": voice_settings["speed"]
                        }
                    )
                else:
                    error_text = await response.text()
                    try:
                        error_json = json.loads(error_text)
                        error_message = error_json.get("error", {}).get("message", error_text)
                    except:
                        error_message = error_text
                    
                    return self._create_error_result(
                        f"OpenAI TTS error ({response.status}): {error_message}"
                    )
        
        except Exception as e:
            return self._create_error_result(f"OpenAI TTS failed: {str(e)}")
    
    async def speech_to_text(
        self,
        audio_data: bytes,
        voice_connection: VoiceConnection
    ) -> str:
        """Convert speech to text using OpenAI Whisper API"""
        
        # Validate connection
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            raise ValueError(f"Invalid connection: {', '.join(validation['errors'])}")
        
        if voice_connection.provider_type not in ["stt", "both"]:
            raise ValueError("This voice connection doesn't support STT")
        
        base_url = self._get_base_url(voice_connection)
        url = f"{base_url}/audio/transcriptions"
        
        # Prepare multipart form data
        data = aiohttp.FormData()
        data.add_field('file', 
                      io.BytesIO(audio_data), 
                      filename='audio.wav', 
                      content_type='audio/wav')
        data.add_field('model', 'whisper-1')
        data.add_field('response_format', 'text')
        
        headers = {
            "Authorization": f"Bearer {voice_connection.api_key}"
        }
        
        try:
            session = await self._get_session()
            
            async with session.post(
                url=url,
                headers=headers,
                data=data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                
                if response.status == 200:
                    transcription = await response.text()
                    return transcription.strip()
                else:
                    error_text = await response.text()
                    try:
                        error_json = json.loads(error_text)
                        error_message = error_json.get("error", {}).get("message", error_text)
                    except:
                        error_message = error_text
                    
                    raise Exception(f"OpenAI STT error ({response.status}): {error_message}")
        
        except Exception as e:
            raise Exception(f"OpenAI STT failed: {str(e)}")
    
    async def test_connection(
        self,
        voice_connection: VoiceConnection
    ) -> VoiceConnectionTestResult:
        """Test OpenAI connection by making a simple TTS request"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return VoiceConnectionTestResult(
                success=False,
                message=f"Connection validation failed: {', '.join(validation['errors'])}"
            )
        
        # Test with a short text
        test_text = "Test"
        
        try:
            result = await self.text_to_speech(test_text, voice_connection)
            
            if result.success:
                return VoiceConnectionTestResult(
                    success=True,
                    message="OpenAI TTS connection successful",
                    details={
                        "test_audio_size_bytes": result.file_size_bytes,
                        "test_text": test_text
                    },
                    provider_info={
                        "provider": "openai",
                        "supported_features": {
                            "tts": voice_connection.provider_type in ["tts", "both"],
                            "stt": voice_connection.provider_type in ["stt", "both"]
                        },
                        "available_voices": len(self.AVAILABLE_VOICES),
                        "base_url": self._get_base_url(voice_connection)
                    }
                )
            else:
                return VoiceConnectionTestResult(
                    success=False,
                    message=result.error_message or "OpenAI TTS connection test failed"
                )
        
        except Exception as e:
            return VoiceConnectionTestResult(
                success=False,
                message=f"OpenAI connection test failed: {str(e)}"
            )
    
    async def get_available_voices(
        self,
        voice_connection: VoiceConnection
    ) -> List[Dict[str, Any]]:
        """Get available voices for OpenAI TTS"""
        
        validation = self.validate_connection(voice_connection)
        if not validation["valid"]:
            return []
        
        # OpenAI has a fixed set of voices
        return [
            {
                "id": voice["id"],
                "name": voice["name"],
                "description": voice["description"],
                "category": "generated",
                "gender": "mixed",  # OpenAI doesn't specify gender
                "age": "adult",
                "accent": "american",
                "preview_url": None,  # OpenAI doesn't provide preview URLs
                "available_for_tiers": ["all"]
            }
            for voice in self.AVAILABLE_VOICES
        ]
    
    async def generate_voice_sample(
        self,
        text: str,
        voice_connection: VoiceConnection,
        sample_text: Optional[str] = None
    ) -> VoiceGenerationResult:
        """Generate a voice sample for testing"""
        
        test_text = sample_text or text or "Hello, this is a test of the OpenAI voice synthesis."
        
        # Limit sample text length
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