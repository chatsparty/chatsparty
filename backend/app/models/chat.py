from pydantic import BaseModel
from typing import Dict, Any, Optional, List


class ChatMessage(BaseModel):
    message: str
    context: str = ""


class ChatResponse(BaseModel):
    response: str
    type: str = "chat_response"


class ChatStyle(BaseModel):
    friendliness: str = "friendly"  # friendly, neutral, formal
    response_length: str = "medium"  # short, medium, long
    personality: str = "balanced"   # enthusiastic, balanced, reserved
    humor: str = "light"           # none, light, witty
    expertise_level: str = "expert" # beginner, intermediate, expert


class ModelConfig(BaseModel):
    provider: str = "ollama"  # ollama, openai, anthropic, gemini, groq
    model_name: str = "gemma2:2b"
    api_key: Optional[str] = None
    base_url: Optional[str] = None  # For Ollama or custom endpoints


class AgentCreateRequest(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    model_configuration: ModelConfig
    chat_style: Optional[ChatStyle] = None


class AgentResponse(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    model_configuration: ModelConfig
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