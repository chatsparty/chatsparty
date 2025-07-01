"""Voice filtering and selection strategies."""
import logging
from typing import List, Set
from abc import ABC, abstractmethod

from .models import Voice, Gender, VoiceType

logger = logging.getLogger(__name__)


class VoiceFilter(ABC):
    """Abstract base class for voice filters."""
    
    @abstractmethod
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Filter voices based on criteria."""
        pass


class GenderFilter(VoiceFilter):
    """Filter voices by gender."""
    
    def __init__(self, gender: Gender):
        self.gender = gender
    
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Filter voices matching the specified gender."""
        if self.gender == Gender.UNSPECIFIED:
            return voices
        
        filtered = [v for v in voices if v.gender == self.gender]
        logger.debug(f"Gender filter ({self.gender.value}): {len(filtered)}/{len(voices)} voices")
        return filtered


class LanguageFilter(VoiceFilter):
    """Filter voices by language preference."""
    
    def __init__(self, language_preference: str):
        self.language_preference = language_preference
        self.language_code = language_preference[:2] if language_preference else ""
    
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Filter voices supporting the specified language."""
        if not self.language_preference:
            return voices
        
        filtered = [
            v for v in voices 
            if any(lang.startswith(self.language_code) for lang in v.language_codes)
        ]
        logger.debug(f"Language filter ({self.language_preference}): {len(filtered)}/{len(voices)} voices")
        return filtered


class VoiceTypeFilter(VoiceFilter):
    """Filter voices by voice type priority."""
    
    TYPE_PRIORITY = [VoiceType.CHIRP, VoiceType.NEURAL2, VoiceType.WAVENET, VoiceType.STANDARD]
    
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Sort voices by voice type priority."""
        if not voices:
            return voices
        
        voice_groups = {vtype: [] for vtype in VoiceType}
        for voice in voices:
            voice_groups[voice.voice_type].append(voice)
        
        sorted_voices = []
        for vtype in self.TYPE_PRIORITY:
            sorted_voices.extend(voice_groups.get(vtype, []))
        
        for vtype, vlist in voice_groups.items():
            if vtype not in self.TYPE_PRIORITY:
                sorted_voices.extend(vlist)
        
        return sorted_voices


class UnusedVoiceFilter(VoiceFilter):
    """Filter to prioritize unused voices."""
    
    def __init__(self, used_voice_ids: Set[str]):
        self.used_voice_ids = used_voice_ids
    
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Separate unused voices from used ones."""
        unused = [v for v in voices if v.id not in self.used_voice_ids]
        used = [v for v in voices if v.id in self.used_voice_ids]
        
        logger.debug(f"Unused voice filter: {len(unused)} unused, {len(used)} used")
        
        return unused + used


class CompositeFilter(VoiceFilter):
    """Composite filter that applies multiple filters in sequence."""
    
    def __init__(self, filters: List[VoiceFilter]):
        self.filters = filters
    
    def filter(self, voices: List[Voice]) -> List[Voice]:
        """Apply all filters in sequence."""
        result = voices
        for f in self.filters:
            result = f.filter(result)
            if not result:
                logger.debug(f"No voices left after {f.__class__.__name__}")
                break
        return result