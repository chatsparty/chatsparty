"""Voice assignment manager that handles the assignment logic."""
import logging
from typing import Optional, List

from .models import Voice, VoiceAssignment, VoiceAssignmentRequest, FallbackVoices
from .voice_store import VoiceStore
from .voice_filter import (
    GenderFilter, 
    LanguageFilter, 
    VoiceTypeFilter, 
    UnusedVoiceFilter,
    CompositeFilter
)
from .voice_selector import DiversitySelector, RandomSelector

logger = logging.getLogger(__name__)


class VoiceAssignmentManager:
    """Manages voice assignment logic."""
    
    def __init__(self, voice_store: VoiceStore):
        self.voice_store = voice_store
        self.fallback_voices = FallbackVoices()
        self.selector = DiversitySelector()
    
    def assign_voice(self, request: VoiceAssignmentRequest) -> str:
        """Assign a voice to an agent based on the request."""
        existing_voice = self._get_existing_assignment(request)
        if existing_voice:
            logger.debug(f"Using existing voice {existing_voice} for agent {request.agent_id}")
            return existing_voice
        
        available_voices = self.voice_store.get_available_voices(request.provider)
        
        if not available_voices:
            logger.warning(f"No available voices for provider {request.provider}, using fallback")
            return self._get_fallback_voice(request)
        
        filtered_voices = self._apply_filters(available_voices, request)
        
        if not filtered_voices:
            filtered_voices = self._apply_relaxed_filters(available_voices, request)
        
        if not filtered_voices:
            logger.warning(f"No voices match criteria for agent {request.agent_name}, using all available")
            filtered_voices = available_voices
        
        used_voices = self.voice_store.get_used_voices(request.conversation_id)
        
        selected_voice = self._select_voice(filtered_voices, used_voices)
        
        if not selected_voice:
            logger.error(f"Failed to select voice for agent {request.agent_name}, using fallback")
            return self._get_fallback_voice(request)
        
        assignment = VoiceAssignment(
            agent_id=request.agent_id,
            voice_id=selected_voice.id,
            conversation_id=request.conversation_id
        )
        self.voice_store.assign_voice(assignment)
        
        logger.info(
            f"Assigned {selected_voice.voice_type.value} voice {selected_voice.id} "
            f"to agent {request.agent_name} (ID: {request.agent_id})"
        )
        
        return selected_voice.id
    
    def _get_existing_assignment(self, request: VoiceAssignmentRequest) -> Optional[str]:
        """Check for existing voice assignment."""
        return self.voice_store.get_agent_voice(request.agent_id, request.conversation_id)
    
    def _apply_filters(self, voices: List[Voice], request: VoiceAssignmentRequest) -> List[Voice]:
        """Apply filters based on request criteria."""
        filters = []
        
        gender_enum = request.get_gender_enum()
        if gender_enum != gender_enum.UNSPECIFIED:
            filters.append(GenderFilter(gender_enum))
        
        if request.language_preference:
            filters.append(LanguageFilter(request.language_preference))
        
        filters.append(VoiceTypeFilter())
        
        used_voices = self.voice_store.get_used_voices(request.conversation_id)
        filters.append(UnusedVoiceFilter(used_voices))
        
        composite = CompositeFilter(filters)
        return composite.filter(voices)
    
    def _apply_relaxed_filters(self, voices: List[Voice], request: VoiceAssignmentRequest) -> List[Voice]:
        """Apply relaxed filters (gender only)."""
        gender_enum = request.get_gender_enum()
        if gender_enum == gender_enum.UNSPECIFIED:
            return []
        
        filters = [
            GenderFilter(gender_enum),
            VoiceTypeFilter()
        ]
        
        composite = CompositeFilter(filters)
        return composite.filter(voices)
    
    def _select_voice(self, voices: List[Voice], used_voice_ids: set) -> Optional[Voice]:
        """Select a voice from filtered options."""
        unused_voices = [v for v in voices if v.id not in used_voice_ids]
        
        if unused_voices:
            return self.selector.select(unused_voices, used_voice_ids)
        else:
            logger.warning("All filtered voices are in use, selecting randomly")
            random_selector = RandomSelector()
            return random_selector.select(voices, used_voice_ids)
    
    def _get_fallback_voice(self, request: VoiceAssignmentRequest) -> str:
        """Get fallback voice based on gender."""
        gender_enum = request.get_gender_enum()
        return self.fallback_voices.get_by_gender(gender_enum)