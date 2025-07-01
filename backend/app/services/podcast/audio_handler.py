"""Audio handler using soundfile and numpy for reliable audio processing without ffmpeg dependencies."""
import io
import numpy as np
import soundfile as sf
from typing import Optional, List, Tuple, Union
import logging
import wave
import struct

logger = logging.getLogger(__name__)

class SimpleAudioSegment:
    """A simple audio segment class that mimics pydub's AudioSegment interface without ffmpeg dependency."""
    
    def __init__(self, data: np.ndarray, sample_rate: int = 44100, channels: int = 1):
        """Initialize audio segment with raw audio data."""
        self.data = data
        self.sample_rate = sample_rate
        self.channels = channels
        self.frame_rate = sample_rate
        
    @classmethod
    def from_file(cls, file_path: str, format: Optional[str] = None) -> 'SimpleAudioSegment':
        """Load audio from file using soundfile."""
        try:
            data, sample_rate = sf.read(file_path)
            
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
            
            return cls(data, sample_rate, channels=1)
        except Exception as e:
            logger.error(f"Failed to load audio file {file_path}: {e}")
            if format == 'wav' or file_path.endswith('.wav'):
                return cls._load_wav_raw(file_path)
            raise
    
    @classmethod
    def from_bytes(cls, audio_bytes: bytes, format: str = 'wav', sample_rate: Optional[int] = None) -> 'SimpleAudioSegment':
        """Load audio from bytes."""
        if format == 'wav':
            try:
                data, sr = sf.read(io.BytesIO(audio_bytes))
                logger.info(f"Soundfile loaded: sample_rate={sr}Hz, shape={data.shape}, dtype={data.dtype}")
                
                if len(data.shape) > 1:
                    logger.info(f"Converting stereo to mono by averaging channels")
                    data = np.mean(data, axis=1)
                
                if sample_rate and sample_rate != sr:
                    logger.warning(f"Requested sample_rate {sample_rate}Hz differs from file's {sr}Hz")
                
                logger.info(f"Audio data stats: min={data.min():.3f}, max={data.max():.3f}, mean={data.mean():.3f}")
                
                return cls(data, sr, channels=1)
            except Exception as e:
                logger.error(f"Failed to load WAV from bytes with soundfile: {e}")
                logger.info("Falling back to manual WAV parsing")
                return cls._load_wav_bytes(audio_bytes)
        else:
            raise ValueError(f"Unsupported format for bytes loading: {format}")
    
    @classmethod
    def _load_wav_raw(cls, file_path: str) -> 'SimpleAudioSegment':
        """Load WAV file using raw wave module."""
        with wave.open(file_path, 'rb') as wav_file:
            sample_rate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            n_channels = wav_file.getnchannels()
            
            frames = wav_file.readframes(n_frames)
            
            if wav_file.getsampwidth() == 2:
                data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            else:
                raise ValueError(f"Unsupported sample width: {wav_file.getsampwidth()}")
            
            if n_channels > 1:
                data = data.reshape(-1, n_channels).mean(axis=1)
                
            return cls(data, sample_rate, channels=1)
    
    @classmethod
    def _load_wav_bytes(cls, audio_bytes: bytes) -> 'SimpleAudioSegment':
        """Load WAV from bytes using wave module."""
        logger.info(f"_load_wav_bytes: Loading WAV from {len(audio_bytes)} bytes")
        
        with wave.open(io.BytesIO(audio_bytes), 'rb') as wav_file:
            sample_rate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            
            logger.info(f"WAV header parsed: sample_rate={sample_rate}Hz, frames={n_frames}, channels={n_channels}, sample_width={sample_width}")
            
            frames = wav_file.readframes(n_frames)
            
            if sample_width == 2:
                data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            elif sample_width == 1:
                data = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128) / 128.0
            else:
                raise ValueError(f"Unsupported sample width: {sample_width}")
            
            expected_duration = n_frames / sample_rate
            actual_samples = len(data) // n_channels if n_channels > 1 else len(data)
            logger.info(f"Expected duration: {expected_duration:.3f}s, Actual samples: {actual_samples}")
            
            if n_channels > 1:
                logger.info(f"Converting {n_channels} channels to mono")
                data = data.reshape(-1, n_channels).mean(axis=1)
            
            logger.info(f"Final audio: {len(data)} samples, duration={len(data)/sample_rate:.3f}s")
            
            return cls(data, sample_rate, channels=1)
    
    @classmethod
    def silent(cls, duration: int, sample_rate: int = 44100) -> 'SimpleAudioSegment':
        """Create a silent audio segment of specified duration in milliseconds."""
        n_samples = int(sample_rate * duration / 1000)
        data = np.zeros(n_samples)
        return cls(data, sample_rate)
    
    @classmethod
    def empty(cls, sample_rate: int = 44100) -> 'SimpleAudioSegment':
        """Create an empty audio segment."""
        return cls(np.array([]), sample_rate)
    
    def __add__(self, other: 'SimpleAudioSegment') -> 'SimpleAudioSegment':
        """Concatenate two audio segments."""
        if len(self.data) == 0:
            result = SimpleAudioSegment(other.data.copy(), other.sample_rate, other.channels)
            result.frame_rate = other.sample_rate
            return result
        if len(other.data) == 0:
            result = SimpleAudioSegment(self.data.copy(), self.sample_rate, self.channels)
            result.frame_rate = self.sample_rate
            return result
            
        if self.sample_rate != other.sample_rate:
            logger.debug(f"Resampling audio from {other.sample_rate}Hz to {self.sample_rate}Hz")
            other_resampled = self._resample(other.data, other.sample_rate, self.sample_rate)
            new_data = np.concatenate([self.data, other_resampled])
        else:
            new_data = np.concatenate([self.data, other.data])
        
        result = SimpleAudioSegment(new_data, self.sample_rate, self.channels)
        result.frame_rate = self.sample_rate
        return result
    
    def __len__(self) -> int:
        """Return length in milliseconds."""
        return int(len(self.data) * 1000 / self.sample_rate)
    
    def set_frame_rate(self, new_rate: int) -> 'SimpleAudioSegment':
        """Resample audio to a new frame rate."""
        if new_rate == self.sample_rate:
            return self
        
        logger.debug(f"Resampling audio from {self.sample_rate}Hz to {new_rate}Hz")
        resampled_data = self._resample(self.data, self.sample_rate, new_rate)
        return SimpleAudioSegment(resampled_data, new_rate, self.channels)
    
    def __getitem__(self, key: slice) -> 'SimpleAudioSegment':
        """Support slicing by milliseconds."""
        if isinstance(key, slice):
            start_sample = int((key.start or 0) * self.sample_rate / 1000)
            stop_sample = int((key.stop or len(self)) * self.sample_rate / 1000) if key.stop else len(self.data)
            
            new_data = self.data[start_sample:stop_sample]
            return SimpleAudioSegment(new_data, self.sample_rate, self.channels)
        else:
            raise TypeError("Audio segments only support slice indexing")
    
    def _resample(self, data: np.ndarray, from_rate: int, to_rate: int) -> np.ndarray:
        """Simple resampling using linear interpolation."""
        if from_rate == to_rate:
            return data
        
        new_length = int(len(data) * to_rate / from_rate)
        
        old_indices = np.arange(len(data))
        new_indices = np.linspace(0, len(data) - 1, new_length)
        
        return np.interp(new_indices, old_indices, data)
    
    def export(self, file_path: str, format: str = 'wav', bitrate: Optional[str] = None) -> None:
        """Export audio to file. Currently only supports WAV format to avoid ffmpeg dependency."""
        if format != 'wav':
            logger.warning(f"Only WAV export is supported without ffmpeg. Exporting as WAV instead of {format}")
            format = 'wav'
        
        if not file_path.endswith('.wav'):
            file_path = file_path.rsplit('.', 1)[0] + '.wav'
        
        logger.info(f"Exporting audio: sample_rate={self.sample_rate}Hz, channels={self.channels}, duration={len(self.data)/self.sample_rate:.2f}s")
        
        with wave.open(file_path, 'wb') as wav_file:
            wav_file.setnchannels(self.channels)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            
            data_int16 = np.clip(self.data * 32767, -32768, 32767).astype(np.int16)
            
            wav_file.writeframes(data_int16.tobytes())
            
            actual_framerate = wav_file.getframerate()
            actual_nframes = wav_file.getnframes()
            logger.info(f"WAV file written: framerate={actual_framerate}Hz, frames={actual_nframes}, duration={actual_nframes/actual_framerate:.2f}s")
        
        logger.info(f"Exported audio to {file_path} as WAV format")


def normalize(audio_segment: SimpleAudioSegment, headroom: float = 0.1) -> SimpleAudioSegment:
    """Normalize audio to maximize volume without clipping."""
    data = audio_segment.data
    
    max_val = np.max(np.abs(data))
    
    if max_val > 0:
        target_max = 1.0 - headroom
        factor = target_max / max_val
        
        normalized_data = data * factor
    else:
        normalized_data = data
    
    return SimpleAudioSegment(normalized_data, audio_segment.sample_rate, audio_segment.channels)


AudioSegment = SimpleAudioSegment