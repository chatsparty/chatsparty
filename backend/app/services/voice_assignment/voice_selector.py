"""Voice selection strategies."""
import random
import logging
from typing import List, Set, Optional
from abc import ABC, abstractmethod

from .models import Voice

logger = logging.getLogger(__name__)


class VoiceSelector(ABC):
    """Abstract base class for voice selection strategies."""
    
    @abstractmethod
    def select(self, voices: List[Voice], used_voice_ids: Set[str]) -> Optional[Voice]:
        """Select a voice from the available options."""
        pass


class RandomSelector(VoiceSelector):
    """Select a voice randomly."""
    
    def select(self, voices: List[Voice], used_voice_ids: Set[str]) -> Optional[Voice]:
        """Randomly select a voice."""
        if not voices:
            return None
        return random.choice(voices)


class DiversitySelector(VoiceSelector):
    """Select voices to maximize diversity."""
    
    def select(self, voices: List[Voice], used_voice_ids: Set[str]) -> Optional[Voice]:
        """Select a voice that maximizes diversity from already used voices."""
        if not voices:
            return None
        
        if not used_voice_ids:
            return random.choice(voices)
        
        voice_scores = []
        
        for voice in voices:
            score = self._calculate_diversity_score(voice, used_voice_ids)
            voice_scores.append((voice, score))
        
        voice_scores.sort(key=lambda x: x[1], reverse=True)
        
        top_score = voice_scores[0][1]
        top_voices = [v for v, s in voice_scores if s == top_score]
        
        selected = random.choice(top_voices)
        logger.debug(f"Selected voice {selected.id} with diversity score {top_score}")
        
        return selected
    
    def _calculate_diversity_score(self, voice: Voice, used_voice_ids: Set[str]) -> int:
        """Calculate diversity score for a voice."""
        score = 0
        
        for used_id in used_voice_ids:
            if voice.language_codes and not any(
                used_id.startswith(lang[:2]) for lang in voice.language_codes
            ):
                score += 3
            
            voice_variant = voice.id.split("-")[-1]
            used_variant = used_id.split("-")[-1]
            if voice_variant != used_variant:
                score += 2
            
            voice_family = "-".join(voice.id.split("-")[:-1])
            used_family = "-".join(used_id.split("-")[:-1])
            if voice_family != used_family:
                score += 1
        
        return score


class FirstAvailableSelector(VoiceSelector):
    """Select the first available voice."""
    
    def select(self, voices: List[Voice], used_voice_ids: Set[str]) -> Optional[Voice]:
        """Select the first voice in the list."""
        return voices[0] if voices else None


class LeastUsedSelector(VoiceSelector):
    """Select the least used voice when all voices are already in use."""
    
    def __init__(self, usage_counter: Optional[dict] = None):
        self.usage_counter = usage_counter or {}
    
    def select(self, voices: List[Voice], used_voice_ids: Set[str]) -> Optional[Voice]:
        """Select the voice with the lowest usage count."""
        if not voices:
            return None
        
        min_usage = float('inf')
        candidates = []
        
        for voice in voices:
            usage = self.usage_counter.get(voice.id, 0)
            if usage < min_usage:
                min_usage = usage
                candidates = [voice]
            elif usage == min_usage:
                candidates.append(voice)
        
        selected = random.choice(candidates)
        
        self.usage_counter[selected.id] = self.usage_counter.get(selected.id, 0) + 1
        
        return selected