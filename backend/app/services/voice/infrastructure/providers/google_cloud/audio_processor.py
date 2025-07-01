import struct
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Handles audio processing and format conversion for Google Cloud TTS"""
    
    @staticmethod
    def create_wav_header(pcm_data_size: int, sample_rate: int, channels: int = 1, bits_per_sample: int = 16) -> bytes:
        """
        Create WAV header for PCM data
        
        Args:
            pcm_data_size: Size of PCM data in bytes
            sample_rate: Audio sample rate in Hz
            channels: Number of audio channels (default: 1 for mono)
            bits_per_sample: Bits per sample (default: 16)
            
        Returns:
            WAV header bytes
        """
        # Calculate derived values
        byte_rate = sample_rate * channels * bits_per_sample // 8
        block_align = channels * bits_per_sample // 8
        
        # Build WAV header
        header = b'RIFF'
        header += struct.pack('<I', pcm_data_size + 36)  # File size - 8
        header += b'WAVE'
        header += b'fmt '
        header += struct.pack('<I', 16)  # fmt chunk size
        header += struct.pack('<H', 1)   # Audio format (1 = PCM)
        header += struct.pack('<H', channels)  # Number of channels
        header += struct.pack('<I', sample_rate)  # Sample rate
        header += struct.pack('<I', byte_rate)  # Byte rate
        header += struct.pack('<H', block_align)  # Block align
        header += struct.pack('<H', bits_per_sample)  # Bits per sample
        header += b'data'
        header += struct.pack('<I', pcm_data_size)  # Data chunk size
        
        return header
    
    @staticmethod
    def wrap_pcm_in_wav(pcm_data: bytes, sample_rate: int) -> Tuple[bytes, str]:
        """
        Wrap LINEAR16 PCM data in WAV format
        
        Args:
            pcm_data: Raw PCM audio data
            sample_rate: Audio sample rate in Hz
            
        Returns:
            Tuple of (wav_data, format_type)
        """
        logger.info(f"Wrapping LINEAR16 PCM data ({len(pcm_data)} bytes) in WAV format at {sample_rate}Hz")
        
        # Create WAV header for mono 16-bit PCM
        wav_header = AudioProcessor.create_wav_header(len(pcm_data), sample_rate)
        
        # Combine header with PCM data
        wav_data = wav_header + pcm_data
        logger.info(f"Created WAV file: {len(wav_data)} bytes total")
        
        return wav_data, "wav"
    
    @staticmethod
    def validate_pcm_data(pcm_data: bytes) -> bool:
        """
        Validate PCM data
        
        Args:
            pcm_data: PCM audio data to validate
            
        Returns:
            True if data appears valid, False otherwise
        """
        if not pcm_data:
            logger.error("PCM data is empty")
            return False
            
        if len(pcm_data) % 2 != 0:
            logger.warning("PCM data length is not even (expected for 16-bit samples)")
            return False
            
        return True