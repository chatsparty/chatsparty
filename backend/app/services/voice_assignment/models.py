"""Voice assignment models and data classes."""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class Gender(Enum):
    """Gender options for voice selection."""
    MALE = "MALE"
    FEMALE = "FEMALE"
    NEUTRAL = "NEUTRAL"
    UNSPECIFIED = "UNSPECIFIED"


class VoiceType(Enum):
    """Types of voices available."""
    CHIRP = "Chirp"
    NEURAL2 = "Neural2"
    STANDARD = "Standard"
    WAVENET = "WaveNet"
    UNKNOWN = "Unknown"


@dataclass
class Voice:
    """Represents a voice with its properties."""
    id: str
    gender: Gender
    language_codes: List[str]
    voice_type: VoiceType
    provider: str = "google"
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Voice":
        """Create Voice instance from dictionary."""
        gender_str = data.get("gender", "").upper()
        gender = Gender[gender_str] if gender_str in Gender.__members__ else Gender.UNSPECIFIED
        
        voice_type_str = data.get("voice_type", "Unknown")
        voice_type = VoiceType[voice_type_str.upper()] if voice_type_str.upper() in VoiceType.__members__ else VoiceType.UNKNOWN
        
        return cls(
            id=data["id"],
            gender=gender,
            language_codes=data.get("language_codes", []),
            voice_type=voice_type,
            provider=data.get("provider", "google")
        )
    
    def to_dict(self) -> Dict:
        """Convert Voice instance to dictionary."""
        return {
            "id": self.id,
            "gender": self.gender.value,
            "language_codes": self.language_codes,
            "voice_type": self.voice_type.value,
            "provider": self.provider
        }


@dataclass
class VoiceAssignmentRequest:
    """Request for voice assignment."""
    agent_id: str
    agent_name: str
    agent_gender: Optional[str] = None
    provider: str = "google"
    conversation_id: Optional[str] = None
    language_preference: Optional[str] = None
    
    def get_gender_enum(self) -> Gender:
        """Convert gender string to Gender enum."""
        if not self.agent_gender:
            return Gender.UNSPECIFIED
        
        gender_lower = self.agent_gender.lower()
        if gender_lower in ["male", "m", "man"]:
            return Gender.MALE
        elif gender_lower in ["female", "f", "woman"]:
            return Gender.FEMALE
        elif gender_lower in ["neutral", "n"]:
            return Gender.NEUTRAL
        else:
            return Gender.UNSPECIFIED


@dataclass
class VoiceAssignment:
    """Represents a voice assignment to an agent."""
    agent_id: str
    voice_id: str
    conversation_id: Optional[str] = None
    
    @property
    def is_conversation_specific(self) -> bool:
        """Check if this assignment is specific to a conversation."""
        return self.conversation_id is not None


@dataclass
class FallbackVoices:
    """Fallback voices for different genders."""
    male: str = "en-US-Chirp3-HD-Fenrir"
    female: str = "en-US-Chirp3-HD-Kore"
    neutral: str = "en-US-Chirp3-HD-Kore"
    
    def get_by_gender(self, gender: Gender) -> str:
        """Get fallback voice by gender."""
        mapping = {
            Gender.MALE: self.male,
            Gender.FEMALE: self.female,
            Gender.NEUTRAL: self.neutral,
            Gender.UNSPECIFIED: self.neutral
        }
        return mapping.get(gender, self.neutral)