from typing import List, Dict, Any, Optional
import re
import json
import logging
from datetime import datetime
from .chat_service import ChatService
from ..ai_core.entities import Message, ConversationMessage, Agent

logger = logging.getLogger(__name__)


class EnhancedChatService:
    """Enhanced chat service - MCP functionality removed, now delegates to base service"""
    
    def __init__(self, base_chat_service: ChatService):
        self.base_chat_service = base_chat_service
    
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Agent chat - MCP functionality removed, using base chat service"""
        return await self.base_chat_service.agent_chat(agent_id, message, conversation_id, user_id)
    
    async def process_chat(
        self,
        agent: Agent,
        message: str,
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Process chat message - MCP functionality removed, using base chat service"""
        return await self.base_chat_service.process_chat(agent, message, conversation_id, user_id)