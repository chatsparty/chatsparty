from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime


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


class AgentResponse(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    connection_id: str
    chat_style: Optional[ChatStyle] = None


class AgentChatRequest(BaseModel):
    agent_id: str
    message: str
    conversation_id: str = "default"


class MultiAgentConversationRequest(BaseModel):
    conversation_id: str
    agent_ids: List[str]
    initial_message: str
    max_turns: int = 10


class ConversationMessage(BaseModel):
    speaker: str
    agent_id: Optional[str] = None
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


