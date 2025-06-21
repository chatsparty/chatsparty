from pydantic import BaseModel
from typing import Dict, Any, Optional, List


class AgentVoiceConfig(BaseModel):
    voice_connection_id: Optional[str] = None
    voice_enabled: bool = False
    podcast_settings: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    message: str
    context: str = ""


class ChatResponse(BaseModel):
    response: str
    type: str = "chat_response"


class ChatStyle(BaseModel):
    friendliness: str = "friendly"
    response_length: str = "medium"
    personality: str = "balanced"
    humor: str = "light"
    expertise_level: str = "expert"


class ModelConfig(BaseModel):
    provider: str = "ollama"
    model_name: str = "gemma2:2b"
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class AgentCreateRequest(BaseModel):
    agent_id: Optional[str] = None
    name: str
    prompt: str
    characteristics: str
    connection_id: str
    chat_style: Optional[ChatStyle] = None
    voice_config: Optional[AgentVoiceConfig] = None


class AgentResponse(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    connection_id: str
    chat_style: Optional[ChatStyle] = None
    voice_config: Optional[AgentVoiceConfig] = None


class AgentChatRequest(BaseModel):
    agent_id: str
    message: str
    conversation_id: str = "default"


class FileAttachment(BaseModel):
    filename: str
    content: str
    file_type: str

class MultiAgentConversationRequest(BaseModel):
    conversation_id: str
    agent_ids: List[str]
    initial_message: str
    max_turns: int = 10
    file_attachments: Optional[List[FileAttachment]] = None


class ConversationMessage(BaseModel):
    speaker: str
    agent_id: Optional[str] = None
    user_id: Optional[str] = None
    message: str
    timestamp: float


class ConnectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    provider: str
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class ConnectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    provider: str
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    created_at: str
    updated_at: str
    is_active: bool = True


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latency: Optional[float] = None


class ConversationShareRequest(BaseModel):
    is_shared: bool


class ConversationShareResponse(BaseModel):
    conversation_id: str
    is_shared: bool
    share_url: Optional[str] = None


class VoiceConnectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    provider: str
    provider_type: str
    voice_id: Optional[str] = None
    speed: float = 1.0
    pitch: float = 1.0
    stability: float = 0.75
    clarity: float = 0.8
    style: str = 'conversational'
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_cloud_proxy: bool = False


class VoiceConnectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    provider_type: Optional[str] = None
    voice_id: Optional[str] = None
    speed: Optional[float] = None
    pitch: Optional[float] = None
    stability: Optional[float] = None
    clarity: Optional[float] = None
    style: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_cloud_proxy: Optional[bool] = None


class VoiceConnectionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    provider: str
    provider_type: str
    voice_id: Optional[str] = None
    speed: float
    pitch: float
    stability: float
    clarity: float
    style: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_active: bool
    is_cloud_proxy: bool
    created_at: str
    updated_at: str


class VoiceConnectionTestResult(BaseModel):
    success: bool
    message: str
    voice_sample_url: Optional[str] = None


class AgentCreateRequestWithVoice(AgentCreateRequest):
    voice_config: Optional[AgentVoiceConfig] = None


class AgentResponseWithVoice(AgentResponse):
    voice_config: Optional[AgentVoiceConfig] = None


class PodcastGenerationRequest(BaseModel):
    conversation_id: str
    include_intro: bool = True
    include_outro: bool = True
    background_music: bool = False
    export_format: str = "mp3"


class PodcastGenerationResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None
    estimated_duration_minutes: Optional[float] = None


class PodcastJobStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[float] = None
    message: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None


class PodcastDownloadResponse(BaseModel):
    success: bool
    message: str
    download_url: Optional[str] = None
    filename: Optional[str] = None
    file_size_bytes: Optional[int] = None


