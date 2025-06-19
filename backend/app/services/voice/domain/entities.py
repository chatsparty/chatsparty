from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class VoiceConnection:
    """Domain entity for voice connections"""
    id: str
    name: str
    description: Optional[str]
    provider: str  # 'elevenlabs', 'openai', 'google', etc.
    provider_type: str  # 'tts', 'stt', 'both'
    voice_id: Optional[str]
    speed: float
    pitch: float
    stability: float
    clarity: float
    style: str
    api_key: Optional[str]
    api_key_encrypted: bool
    base_url: Optional[str]
    is_active: bool
    is_cloud_proxy: bool
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class VoiceGenerationRequest:
    """Request for voice generation"""
    text: str
    voice_connection: VoiceConnection
    output_format: str = "mp3"  # mp3, wav, ogg
    output_quality: str = "standard"  # standard, high, premium


@dataclass
class VoiceGenerationResult:
    """Result of voice generation"""
    success: bool
    audio_data: Optional[bytes]
    audio_url: Optional[str]
    duration_seconds: Optional[float]
    file_size_bytes: Optional[int]
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AgentVoiceConfig:
    """Voice configuration for an agent"""
    agent_id: str
    voice_connection_id: Optional[str]
    voice_enabled: bool
    podcast_settings: Optional[Dict[str, Any]] = None


@dataclass
class PodcastSettings:
    """Settings for podcast generation"""
    include_intro: bool = True
    include_outro: bool = True
    background_music: bool = False
    export_format: str = "mp3"
    quality: str = "standard"
    max_duration_minutes: int = 60
    intro_text: Optional[str] = None
    outro_text: Optional[str] = None


@dataclass
class ConversationVoiceMessage:
    """A conversation message with voice generation info"""
    message_id: str
    agent_id: Optional[str]
    speaker: str
    content: str
    voice_connection_id: Optional[str]
    voice_enabled: bool
    timestamp: datetime
    voice_generation_result: Optional[VoiceGenerationResult] = None


@dataclass
class PodcastGenerationJob:
    """Job for podcast generation"""
    job_id: str
    conversation_id: str
    user_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    progress_percent: float
    settings: PodcastSettings
    created_at: datetime
    completed_at: Optional[datetime] = None
    result_url: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class VoiceConnectionTestResult:
    """Result of voice connection test"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
    provider_info: Optional[Dict[str, Any]] = None
    audio_data: Optional[bytes] = None