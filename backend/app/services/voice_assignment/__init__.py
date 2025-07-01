"""Voice assignment service package."""
# Import the main service implementation
from .service import DynamicVoiceAssignmentService, dynamic_voice_assignment_service

# Import models
from .models import (
    Voice,
    Gender,
    VoiceType,
    VoiceAssignment,
    VoiceAssignmentRequest,
    FallbackVoices
)

__all__ = [
    # Service exports
    "DynamicVoiceAssignmentService",
    "dynamic_voice_assignment_service",
    # Model exports
    "Voice",
    "Gender",
    "VoiceType",
    "VoiceAssignment",
    "VoiceAssignmentRequest",
    "FallbackVoices"
]