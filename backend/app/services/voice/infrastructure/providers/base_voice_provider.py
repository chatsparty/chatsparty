from abc import abstractmethod
from typing import List, Dict, Any, Optional
import aiohttp
import asyncio
from ...domain.entities import VoiceConnection, VoiceGenerationResult, VoiceConnectionTestResult
from ...domain.interfaces import VoiceProviderInterface


class BaseVoiceProvider(VoiceProviderInterface):
    """Base class for voice providers with common functionality"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def _close_session(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        pass
    
    @abstractmethod
    def get_supported_provider_types(self) -> List[str]:
        """Get supported provider types (tts, stt, both)"""
        pass
    
    @abstractmethod
    def requires_api_key(self) -> bool:
        """Whether this provider requires an API key"""
        pass
    
    @abstractmethod
    def get_default_base_url(self) -> Optional[str]:
        """Get default base URL for this provider"""
        pass
    
    @abstractmethod
    async def test_connection(self, voice_connection: VoiceConnection) -> VoiceConnectionTestResult:
        """Test the voice connection by making actual API calls"""
        pass
    
    def validate_connection(self, voice_connection: VoiceConnection) -> Dict[str, Any]:
        """Validate voice connection configuration"""
        errors = []
        
        # Check provider name
        if voice_connection.provider != self.get_provider_name():
            errors.append(f"Provider mismatch: expected {self.get_provider_name()}, got {voice_connection.provider}")
        
        # Check provider type
        if voice_connection.provider_type not in self.get_supported_provider_types():
            errors.append(f"Unsupported provider type: {voice_connection.provider_type}")
        
        # Check API key if required
        if self.requires_api_key() and not voice_connection.api_key:
            errors.append("API key is required for this provider")
        
        # Check voice settings ranges
        if not (0.1 <= voice_connection.speed <= 3.0):
            errors.append("Speed must be between 0.1 and 3.0")
        
        if not (0.1 <= voice_connection.pitch <= 3.0):
            errors.append("Pitch must be between 0.1 and 3.0")
        
        if not (0.0 <= voice_connection.stability <= 1.0):
            errors.append("Stability must be between 0.0 and 1.0")
        
        if not (0.0 <= voice_connection.clarity <= 1.0):
            errors.append("Clarity must be between 0.0 and 1.0")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    async def _make_request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        session = await self._get_session()
        
        try:
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                data=data,
                json=json_data,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json() if response.content_type == 'application/json' else await response.text()
                
                return {
                    "success": response.status == 200,
                    "status_code": response.status,
                    "data": response_data,
                    "headers": dict(response.headers)
                }
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": "Request timeout",
                "status_code": 408
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }
    
    def _create_error_result(self, error_message: str) -> VoiceGenerationResult:
        """Create error result for voice generation"""
        return VoiceGenerationResult(
            success=False,
            audio_data=None,
            audio_url=None,
            duration_seconds=None,
            file_size_bytes=None,
            error_message=error_message
        )
    
    def _create_success_result(
        self,
        audio_data: Optional[bytes] = None,
        audio_url: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        file_size_bytes: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> VoiceGenerationResult:
        """Create success result for voice generation"""
        return VoiceGenerationResult(
            success=True,
            audio_data=audio_data,
            audio_url=audio_url,
            duration_seconds=duration_seconds,
            file_size_bytes=file_size_bytes,
            metadata=metadata
        )
    
    def __del__(self):
        """Cleanup session on deletion"""
        if self.session and not self.session.closed:
            # Can't use await in __del__, so create a task
            asyncio.create_task(self._close_session())