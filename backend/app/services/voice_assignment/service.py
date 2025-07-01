"""Main dynamic voice assignment service."""
import logging
from typing import List, Dict, Optional

from .models import VoiceAssignmentRequest
from .voice_store import VoiceStore
from .assignment_manager import VoiceAssignmentManager

logger = logging.getLogger(__name__)


class DynamicVoiceAssignmentService:
    """Service to automatically assign unique voices to agents based on available voices."""
    
    def __init__(self):
        self.voice_store = VoiceStore()
        self.assignment_manager = VoiceAssignmentManager(self.voice_store)
    
    def set_available_voices(self, provider: str, voices: List[Dict]) -> None:
        """
        Update the cache of available voices for a provider.
        
        Args:
            provider: Voice provider name (e.g., 'google')
            voices: List of voice dictionaries with id, gender, language_codes, etc.
        """
        self.voice_store.set_available_voices(provider, voices)
    
    def assign_voice_to_agent(
        self,
        agent_id: str,
        agent_name: str,
        agent_gender: Optional[str] = None,
        provider: str = "google",
        conversation_id: Optional[str] = None,
        language_preference: Optional[str] = None
    ) -> str:
        """
        Assign a unique voice to an agent from available voices.
        
        Args:
            agent_id: Unique identifier for the agent
            agent_name: Name of the agent
            agent_gender: 'male', 'female', or None
            provider: Voice provider (default: 'google')
            conversation_id: Optional conversation ID for conversation-specific assignments
            language_preference: Optional language preference (e.g., 'en-US', 'es-ES')
        
        Returns:
            Voice ID assigned to the agent
        """
        request = VoiceAssignmentRequest(
            agent_id=agent_id,
            agent_name=agent_name,
            agent_gender=agent_gender,
            provider=provider,
            conversation_id=conversation_id,
            language_preference=language_preference
        )
        
        return self.assignment_manager.assign_voice(request)
    
    def get_agent_voice(self, agent_id: str, conversation_id: Optional[str] = None) -> Optional[str]:
        """
        Get the assigned voice for an agent.
        
        Args:
            agent_id: The agent's unique identifier
            conversation_id: Optional conversation ID to check for conversation-specific assignment
        
        Returns:
            Voice ID if assigned, None otherwise
        """
        return self.voice_store.get_agent_voice(agent_id, conversation_id)
    
    def clear_conversation_voices(self, conversation_id: str) -> None:
        """
        Clear voice assignments for a specific conversation.
        
        Args:
            conversation_id: The conversation ID to clear assignments for
        """
        self.voice_store.clear_conversation_voices(conversation_id)
    
    def get_voice_statistics(self) -> Dict[str, any]:
        """
        Get statistics about voice assignments.
        
        Returns:
            Dictionary with statistics like total assignments, voices per provider, etc.
        """
        stats = {
            "total_global_assignments": len(self.voice_store._global_assignments),
            "total_conversations": len(self.voice_store._conversation_assignments),
            "voices_by_provider": {}
        }
        
        for provider, voices in self.voice_store._available_voices.items():
            stats["voices_by_provider"][provider] = len(voices)
        
        return stats
    
    def has_voices_cached(self, provider: str) -> bool:
        """
        Check if voices are cached for a provider.
        
        Args:
            provider: Voice provider name
            
        Returns:
            True if voices are cached, False otherwise
        """
        return provider in self.voice_store._available_voices and len(self.voice_store._available_voices[provider]) > 0
    
    @property
    def available_voices_cache(self) -> Dict[str, List[Dict]]:
        """
        Get the available voices cache (for backward compatibility).
        
        Returns:
            Dictionary mapping provider to list of voice dictionaries
        """
        cache = {}
        for provider, voices in self.voice_store._available_voices.items():
            cache[provider] = [v.to_dict() for v in voices]
        return cache


dynamic_voice_assignment_service = DynamicVoiceAssignmentService()