"""Audio processing and combination utilities for podcast generation."""
import os
import logging
from typing import List
from collections import Counter

try:
    from .audio_handler import AudioSegment, normalize
except ImportError:
    from pydub import AudioSegment
    from pydub.effects import normalize

from ...models.chat import PodcastGenerationRequest

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Handles audio segment processing and combination."""
    
    def __init__(self, max_podcast_length: int = 3600):
        self.max_podcast_length = max_podcast_length
    
    def apply_fade(self, segment: AudioSegment, fade_in_ms: int = 10, fade_out_ms: int = 10) -> AudioSegment:
        """Apply fade in/out to prevent clicks and pops at segment boundaries."""
        try:
            if fade_in_ms > 0 and hasattr(segment, 'fade_in'):
                segment = segment.fade_in(fade_in_ms)
            
            if fade_out_ms > 0 and hasattr(segment, 'fade_out'):
                segment = segment.fade_out(fade_out_ms)
            
            if hasattr(segment, 'remove_dc_offset'):
                segment = segment.remove_dc_offset()
            
            return segment
        except Exception as e:
            logger.warning(f"Could not apply fade effects: {e}")
            return segment
    
    async def combine_segments(self, segments: List[AudioSegment], request: PodcastGenerationRequest) -> AudioSegment:
        """Combine audio segments into final podcast."""
        logger.info(f"Starting audio combination for {len(segments)} segments")
        
        sample_rates = []
        for i, segment in enumerate(segments):
            duration_ms = len(segment)
            duration_s = duration_ms / 1000.0
            
            sample_rate = None
            if hasattr(segment, 'frame_rate'):
                sample_rate = segment.frame_rate
            elif hasattr(segment, 'sample_rate'):
                sample_rate = segment.sample_rate
            
            channels = getattr(segment, 'channels', 'unknown')
            sample_width = getattr(segment, 'sample_width', 'unknown')
            
            logger.info(f"Segment {i}: duration={duration_s:.2f}s, sample_rate={sample_rate}Hz, channels={channels}, sample_width={sample_width}")
            
            if sample_rate:
                sample_rates.append(sample_rate)
        
        if sample_rates:
            rate_counts = Counter(sample_rates)
            target_sample_rate = rate_counts.most_common(1)[0][0]
            logger.info(f"Most common sample rate: {target_sample_rate}Hz (found in {rate_counts[target_sample_rate]}/{len(segments)} segments)")
        else:
            target_sample_rate = 44100
            logger.warning(f"Could not determine sample rate from segments, using CD quality default: {target_sample_rate}Hz")
        
        combined = AudioSegment.empty()
        if hasattr(AudioSegment, 'empty'):
            try:
                combined = AudioSegment.empty(sample_rate=target_sample_rate)
                logger.info(f"Created empty segment with sample rate: {target_sample_rate}Hz")
            except:
                combined = AudioSegment.empty()
                logger.warning("Could not create empty segment with specific sample rate")
        
        if request.include_intro:
            intro_text = "Welcome to your AI-generated podcast conversation."
            try:
                intro_pause = AudioSegment.silent(duration=2000, sample_rate=target_sample_rate)
                logger.info(f"Created intro silence with specified sample rate: {target_sample_rate}Hz")
            except TypeError:
                intro_pause = AudioSegment.silent(duration=2000)
                logger.warning(f"Could not create intro with sample rate {target_sample_rate}Hz, using default")
            
            actual_intro_rate = getattr(intro_pause, 'sample_rate', 'unknown')
            combined += intro_pause
            logger.info(f"Added 2s intro silence at {actual_intro_rate}Hz")
        
        for i, segment in enumerate(segments):
            try:
                segment_rate = getattr(segment, 'frame_rate', None) or getattr(segment, 'sample_rate', None)
                if segment_rate and segment_rate != target_sample_rate:
                    logger.warning(f"Segment {i} has different sample rate ({segment_rate}Hz), resampling to {target_sample_rate}Hz")
                    if hasattr(segment, 'set_frame_rate'):
                        segment = segment.set_frame_rate(target_sample_rate)
                        logger.info(f"Resampled segment {i} to {target_sample_rate}Hz")
                
                combined += segment
                logger.info(f"Added segment {i} to combined audio. Total duration: {len(combined)/1000:.2f}s")
                
            except Exception as e:
                logger.error(f"Error adding segment {i}: {e}")
        
        if request.include_outro:
            outro_text = "Thank you for listening to this AI-generated conversation."
            try:
                outro_pause = AudioSegment.silent(duration=2000, sample_rate=target_sample_rate)
                logger.info(f"Created outro silence with specified sample rate: {target_sample_rate}Hz")
            except TypeError:
                outro_pause = AudioSegment.silent(duration=2000)
                logger.warning(f"Could not create outro with sample rate {target_sample_rate}Hz, using default")
            
            actual_outro_rate = getattr(outro_pause, 'sample_rate', 'unknown')
            combined += outro_pause
            logger.info(f"Added 2s outro silence at {actual_outro_rate}Hz")
        
        logger.info(f"Combined audio before normalization: duration={len(combined)/1000:.2f}s, sample_rate={getattr(combined, 'frame_rate', 'unknown')}Hz")
        
        combined = normalize(combined)
        logger.info("Audio normalized")
        
        if len(combined) > self.max_podcast_length * 1000:
            logger.warning(f"Podcast exceeds maximum length, truncating to {self.max_podcast_length} seconds")
            combined = combined[:self.max_podcast_length * 1000]
        
        final_duration = len(combined) / 1000.0
        final_rate = getattr(combined, 'frame_rate', 'unknown')
        logger.info(f"Final combined audio: duration={final_duration:.2f}s, sample_rate={final_rate}Hz")
        
        return combined
    
    def save_debug_segment(self, segment: AudioSegment, debug_dir: str, filename: str):
        """Save an audio segment for debugging purposes."""
        if os.path.exists(debug_dir):
            segment_path = os.path.join(debug_dir, filename)
            segment.export(segment_path, format="wav")
            logger.info(f"Saved debug segment to {segment_path}")
    
    def create_pause(self, duration_ms: int = 1000, sample_rate: int = 44100) -> AudioSegment:
        """Create a pause/silence segment."""
        try:
            pause = AudioSegment.silent(duration=duration_ms, sample_rate=sample_rate)
            logger.debug(f"Created {duration_ms}ms pause with sample rate: {sample_rate}Hz")
        except TypeError:
            pause = AudioSegment.silent(duration=duration_ms)
            logger.warning(f"Could not create pause with sample rate {sample_rate}Hz, using default")
        
        return pause