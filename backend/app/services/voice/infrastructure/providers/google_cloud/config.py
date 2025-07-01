from typing import List, Optional


class GoogleCloudConfig:
    """Configuration and constants for Google Cloud TTS provider"""
    
    PROVIDER_NAME = "google"
    DEFAULT_BASE_URL = "https://texttospeech.googleapis.com/v1"
    SUPPORTED_PROVIDER_TYPES = ["tts"]
    SUPPORTED_VOICE_TYPES = ["Standard", "WaveNet", "Neural2", "Studio", "News", "Casual"]
    
    # Audio configuration constants
    DEFAULT_SAMPLE_RATE = 44100  # CD quality
    SUPPORTED_SAMPLE_RATES = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000]
    DEFAULT_AUDIO_ENCODING = "LINEAR16"
    DEFAULT_SPEAKING_RATE = 1.0
    DEFAULT_PITCH = 0.0
    DEFAULT_VOLUME_GAIN = 0.0
    
    # API limits and constraints
    MIN_SPEAKING_RATE = 0.25
    MAX_SPEAKING_RATE = 4.0
    MIN_PITCH = -20.0
    MAX_PITCH = 20.0
    MIN_VOLUME_GAIN = -96.0
    MAX_VOLUME_GAIN = 16.0
    
    # Request timeout
    REQUEST_TIMEOUT = 30
    
    @classmethod
    def get_default_headers(cls, api_key: str) -> dict:
        """Get default headers for API requests"""
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key
        }
    
    @classmethod
    def validate_sample_rate(cls, sample_rate: int) -> bool:
        """Validate if sample rate is supported"""
        return sample_rate in cls.SUPPORTED_SAMPLE_RATES
    
    @classmethod
    def clamp_speaking_rate(cls, rate: float) -> float:
        """Clamp speaking rate to valid range"""
        return max(cls.MIN_SPEAKING_RATE, min(cls.MAX_SPEAKING_RATE, rate))
    
    @classmethod
    def clamp_pitch(cls, pitch: float) -> float:
        """Clamp pitch to valid range"""
        return max(cls.MIN_PITCH, min(cls.MAX_PITCH, pitch))
    
    @classmethod
    def clamp_volume_gain(cls, gain: float) -> float:
        """Clamp volume gain to valid range"""
        return max(cls.MIN_VOLUME_GAIN, min(cls.MAX_VOLUME_GAIN, gain))