from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class VoiceConnectionBase(BaseModel):
    name: str = Field(..., description="Name of the voice connection")
    description: Optional[str] = Field(None, description="Description of the voice connection")
    provider: str = Field(..., description="Voice provider (elevenlabs, openai, google, chatsparty)")
    provider_type: str = Field(..., description="Provider type (tts, stt, both)")
    voice_id: Optional[str] = Field(None, description="Provider-specific voice identifier")
    speed: float = Field(1.0, ge=0.1, le=3.0, description="Voice speed (0.1 to 3.0)")
    pitch: float = Field(1.0, ge=0.1, le=2.0, description="Voice pitch (0.1 to 2.0)")
    stability: float = Field(0.75, ge=0.0, le=1.0, description="Voice stability (0.0 to 1.0)")
    clarity: float = Field(0.8, ge=0.0, le=1.0, description="Voice clarity (0.0 to 1.0)")
    style: str = Field("conversational", description="Voice style (conversational, podcast, professional)")


class VoiceConnectionCreateRequest(VoiceConnectionBase):
    api_key: Optional[str] = Field(None, description="API key for the voice provider")
    base_url: Optional[str] = Field(None, description="Base URL for the voice provider")
    is_cloud_proxy: bool = Field(False, description="Whether this is a cloud proxy connection")


class VoiceConnectionUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="Name of the voice connection")
    description: Optional[str] = Field(None, description="Description of the voice connection")
    voice_id: Optional[str] = Field(None, description="Provider-specific voice identifier")
    speed: Optional[float] = Field(None, ge=0.1, le=3.0, description="Voice speed (0.1 to 3.0)")
    pitch: Optional[float] = Field(None, ge=0.1, le=2.0, description="Voice pitch (0.1 to 2.0)")
    stability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Voice stability (0.0 to 1.0)")
    clarity: Optional[float] = Field(None, ge=0.0, le=1.0, description="Voice clarity (0.0 to 1.0)")
    style: Optional[str] = Field(None, description="Voice style (conversational, podcast, professional)")
    api_key: Optional[str] = Field(None, description="API key for the voice provider")
    base_url: Optional[str] = Field(None, description="Base URL for the voice provider")
    is_active: Optional[bool] = Field(None, description="Whether the connection is active")


class VoiceConnectionResponse(VoiceConnectionBase):
    id: str = Field(..., description="Unique identifier for the voice connection")
    api_key_encrypted: bool = Field(..., description="Whether the API key is encrypted")
    is_active: bool = Field(..., description="Whether the connection is active")
    is_cloud_proxy: bool = Field(..., description="Whether this is a cloud proxy connection")
    is_default: bool = Field(False, description="Whether this is a default platform connection")
    user_id: str = Field(..., description="ID of the user who owns this connection")
    created_at: datetime = Field(..., description="When the connection was created")
    updated_at: datetime = Field(..., description="When the connection was last updated")

    class Config:
        from_attributes = True


class VoiceConnectionTestResult(BaseModel):
    success: bool = Field(..., description="Whether the test was successful")
    message: str = Field(..., description="Test result message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional test details")
    latency_ms: Optional[int] = Field(None, description="API response latency in milliseconds")
    provider_info: Optional[Dict[str, Any]] = Field(None, description="Provider-specific information")


class VoiceOption(BaseModel):
    id: str = Field(..., description="Voice identifier")
    name: str = Field(..., description="Voice name")
    description: str = Field("", description="Voice description")
    category: str = Field("standard", description="Voice category")
    gender: Optional[str] = Field(None, description="Voice gender")
    age: Optional[str] = Field(None, description="Voice age group")
    accent: Optional[str] = Field(None, description="Voice accent")
    preview_url: Optional[str] = Field(None, description="URL to preview the voice")
    available_for_tiers: List[str] = Field(default_factory=list, description="Available subscription tiers")


class VoiceGenerationRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    voice_connection_id: str = Field(..., description="ID of the voice connection to use")


class VoiceGenerationResponse(BaseModel):
    success: bool = Field(..., description="Whether the generation was successful")
    audio_url: Optional[str] = Field(None, description="URL to the generated audio file")
    audio_data: Optional[bytes] = Field(None, description="Raw audio data")
    format: Optional[str] = Field(None, description="Audio format (mp3, wav, etc.)")
    duration_seconds: Optional[float] = Field(None, description="Duration of the audio in seconds")
    message: Optional[str] = Field(None, description="Status message")