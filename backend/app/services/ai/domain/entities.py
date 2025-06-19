from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ModelConfiguration:
    provider: str
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


@dataclass
class ChatStyle:
    friendliness: str = "friendly"
    response_length: str = "medium"
    personality: str = "balanced"
    humor: str = "light"
    expertise_level: str = "expert"


@dataclass
class VoiceConfig:
    voice_enabled: bool = False
    voice_connection_id: Optional[str] = None
    podcast_settings: Optional[dict] = None


@dataclass
class Agent:
    agent_id: str
    name: str
    prompt: str
    characteristics: str
    model_config: ModelConfiguration
    chat_style: ChatStyle
    connection_id: str
    voice_config: Optional[VoiceConfig] = None
    
    def get_system_prompt(self) -> str:
        style_instructions = []
        
        if self.chat_style.friendliness == "friendly":
            style_instructions.append("Be warm, approachable, and friendly in your responses.")
        elif self.chat_style.friendliness == "formal":
            style_instructions.append("Maintain a professional and formal tone.")
        else:
            style_instructions.append("Use a balanced, neither too casual nor too formal tone.")
        
        if self.chat_style.response_length == "short":
            style_instructions.append("Keep your responses brief and concise (1-2 sentences when possible).")
        elif self.chat_style.response_length == "long":
            style_instructions.append("Provide detailed, comprehensive responses with explanations.")
        else:
            style_instructions.append("Keep responses moderate in length - informative but not overly long.")
        
        if self.chat_style.personality == "enthusiastic":
            style_instructions.append("Show enthusiasm and energy in your responses.")
        elif self.chat_style.personality == "reserved":
            style_instructions.append("Be thoughtful and measured in your responses.")
        else:
            style_instructions.append("Maintain a balanced, engaging but not overwhelming personality.")
        
        if self.chat_style.humor == "witty":
            style_instructions.append("Feel free to include appropriate humor and wit.")
        elif self.chat_style.humor == "light":
            style_instructions.append("Occasionally use light humor when appropriate.")
        else:
            style_instructions.append("Keep responses serious and focused.")
        
        if self.chat_style.expertise_level == "beginner":
            style_instructions.append("Explain concepts simply, as if speaking to a beginner.")
        elif self.chat_style.expertise_level == "intermediate":
            style_instructions.append("Use moderate technical language appropriate for someone with some experience.")
        else:
            style_instructions.append("You can use technical language and assume advanced knowledge.")
        
        style_text = " ".join(style_instructions)
        
        return f"""You are {self.name}. 

Your role and characteristics: {self.characteristics}

Your specific instructions: {self.prompt}

Communication style: {style_text}

Please respond in character according to your role, characteristics, and communication style."""


@dataclass
class Message:
    role: str
    content: str
    timestamp: Optional[datetime] = None
    agent_id: Optional[str] = None
    speaker: Optional[str] = None


@dataclass
class ConversationMessage:
    speaker: str
    message: str
    timestamp: float
    agent_id: Optional[str] = None
    message_type: str = "message"


@dataclass
class Conversation:
    conversation_id: str
    messages: List[Message]
    participants: List[str]
    created_at: datetime
    updated_at: datetime