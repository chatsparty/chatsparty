"""Voice store for managing voice data and assignments."""
import logging
from typing import Dict, List, Optional, Set
from collections import defaultdict

from .models import Voice, VoiceAssignment

logger = logging.getLogger(__name__)


class VoiceStore:
    """Store for managing voice data and assignments."""
    
    def __init__(self):
        self._global_assignments: Dict[str, str] = {}
        
        self._conversation_assignments: Dict[str, Dict[str, str]] = defaultdict(dict)
        
        self._available_voices: Dict[str, List[Voice]] = {}
    
    def set_available_voices(self, provider: str, voices: List[Dict]) -> None:
        """Update the cache of available voices for a provider."""
        voice_objects = [Voice.from_dict(v) for v in voices]
        self._available_voices[provider] = voice_objects
        logger.info(f"Updated available voices for {provider}: {len(voice_objects)} voices")
    
    def get_available_voices(self, provider: str) -> List[Voice]:
        """Get available voices for a provider."""
        return self._available_voices.get(provider, [])
    
    def assign_voice(self, assignment: VoiceAssignment) -> None:
        """Store a voice assignment."""
        if assignment.is_conversation_specific:
            self._conversation_assignments[assignment.conversation_id][assignment.agent_id] = assignment.voice_id
            logger.debug(f"Assigned conversation-specific voice {assignment.voice_id} to agent {assignment.agent_id}")
        else:
            self._global_assignments[assignment.agent_id] = assignment.voice_id
            logger.debug(f"Assigned global voice {assignment.voice_id} to agent {assignment.agent_id}")
    
    def get_agent_voice(self, agent_id: str, conversation_id: Optional[str] = None) -> Optional[str]:
        """Get the assigned voice for an agent."""
        if conversation_id and agent_id in self._conversation_assignments.get(conversation_id, {}):
            return self._conversation_assignments[conversation_id][agent_id]
        
        return self._global_assignments.get(agent_id)
    
    def get_used_voices(self, conversation_id: Optional[str] = None) -> Set[str]:
        """Get all voices currently in use."""
        used_voices = set()
        
        if conversation_id:
            used_voices.update(self._conversation_assignments.get(conversation_id, {}).values())
        else:
            used_voices.update(self._global_assignments.values())
            for conv_voices in self._conversation_assignments.values():
                used_voices.update(conv_voices.values())
        
        return used_voices
    
    def clear_conversation_voices(self, conversation_id: str) -> None:
        """Clear voice assignments for a specific conversation."""
        if conversation_id in self._conversation_assignments:
            del self._conversation_assignments[conversation_id]
            logger.info(f"Cleared voice assignments for conversation {conversation_id}")
    
    def has_assignment(self, agent_id: str, conversation_id: Optional[str] = None) -> bool:
        """Check if an agent has a voice assignment."""
        if conversation_id and agent_id in self._conversation_assignments.get(conversation_id, {}):
            return True
        return agent_id in self._global_assignments