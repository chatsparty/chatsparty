"""
AI Core Module

This module contains shared domain entities, interfaces, and utilities 
used across all AI-related services.
"""

from .entities import (
    Agent,
    ChatStyle,
    ModelConfiguration,
    VoiceConfig,
    Message,
    ConversationMessage,
    Conversation
)

from .interfaces import (
    AIServiceInterface,
    AgentRepositoryInterface,
    ConversationRepositoryInterface,
    ModelProviderInterface
)


__all__ = [
    # Entities
    "Agent",
    "ChatStyle",
    "ModelConfiguration", 
    "VoiceConfig",
    "Message",
    "ConversationMessage",
    "Conversation",
    
    # Interfaces
    "AIServiceInterface",
    "AgentRepositoryInterface",
    "ConversationRepositoryInterface",
    "ModelProviderInterface"
]