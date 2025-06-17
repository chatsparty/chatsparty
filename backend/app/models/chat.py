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


class AgentCreateRequest(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    model_name: Optional[str] = None
    chat_style: Optional[ChatStyle] = None


class AgentResponse(BaseModel):
    agent_id: str
    name: str
    prompt: str
    characteristics: str
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