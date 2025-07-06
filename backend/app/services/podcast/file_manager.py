"""File management utilities for podcast generation."""
import os
from typing import Optional, Dict, Any
import logging

from sqlmodel import Session, select
from ...models.database import PodcastJob

logger = logging.getLogger(__name__)


class PodcastFileManager:
    """Handles file storage and retrieval for podcast files."""
    
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        os.makedirs(self.storage_path, exist_ok=True)
    
    def get_download_info(self, session: Session, job_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get download information for a completed podcast job."""
        stmt = select(PodcastJob).where(
            PodcastJob.id == job_id,
            PodcastJob.user_id == user_id,
            PodcastJob.status == "completed"
        )
        result = session.execute(stmt)
        job = result.scalar_one_or_none()
        
        if not job or not job.audio_path or not os.path.exists(job.audio_path):
            return None
        
        return {
            "file_path": job.audio_path,
            "file_size_bytes": job.file_size_bytes,
            "duration_seconds": job.duration_seconds,
            "filename": f"podcast_{job.conversation_id[:8]}.mp3"
        }
    
    def create_debug_directory(self, job_id: str) -> str:
        """Create debug directory for a job."""
        debug_dir = os.path.join(self.storage_path, f"debug_{job_id}")
        os.makedirs(debug_dir, exist_ok=True)
        logger.info(f"Created debug directory at {debug_dir}")
        return debug_dir
    
    def create_debug_summary(self, debug_dir: str, job_id: str, duration: float, 
                           sample_rate: Any, audio_segments: list, output_path: str):
        """Create a debug summary file for troubleshooting."""
        summary_path = os.path.join(debug_dir, "debug_summary.txt")
        with open(summary_path, 'w') as f:
            f.write(f"Podcast Generation Debug Summary\n")
            f.write(f"================================\n")
            f.write(f"Job ID: {job_id}\n")
            f.write(f"Final Duration: {duration:.2f}s\n")
            f.write(f"Final Sample Rate: {sample_rate}Hz\n")
            f.write(f"Number of segments: {len(audio_segments)}\n")
            f.write(f"\nSegment Details:\n")
            for i in range(0, len(audio_segments), 2):
                if i < len(audio_segments):
                    f.write(f"  Segment {i//2}: Speech {len(audio_segments[i])/1000:.2f}s")
                    if i+1 < len(audio_segments):
                        f.write(f" + Pause {len(audio_segments[i+1])/1000:.2f}s")
                    f.write("\n")
            f.write(f"\nDebug files created:\n")
            f.write(f"  - Individual segments: segment_*.wav\n")
            f.write(f"  - Combined before normalization: combined_before_normalization.wav\n")
            f.write(f"  - Final output: {output_path}\n")
            f.write(f"\nTo test for speed issues:\n")
            f.write(f"  1. Play individual segments - they should sound normal\n")
            f.write(f"  2. Play combined_before_normalization.wav\n")
            f.write(f"  3. Play final output\n")
            f.write(f"  4. Compare where the speed issue appears\n")
        
        logger.info(f"Created debug summary at {summary_path}")
    
    def get_output_path(self, job_id: str, format: str = "wav") -> str:
        """Get the output path for a podcast file."""
        return os.path.join(self.storage_path, f"podcast_{job_id}.{format}")
    
    def save_audio_file(self, audio_segment, output_path: str) -> tuple[str, int, float]:
        """Save audio segment to file and return path, size, and duration."""
        if hasattr(audio_segment.__class__, 'from_bytes'):
            logger.info(f"Exporting final audio as WAV to {output_path}")
            audio_segment.export(output_path, format="wav")
        else:
            logger.info(f"Exporting final audio as MP3 to {output_path}")
            
            export_params = {
                "format": "mp3",
                "bitrate": "128k"
            }
            
            export_sample_rate = getattr(audio_segment, 'frame_rate', None)
            if export_sample_rate:
                export_params["parameters"] = ["-ar", str(export_sample_rate)]
                logger.info(f"Setting export sample rate: {export_sample_rate}Hz")
            
            audio_segment.export(output_path, **export_params)
        
        file_size = os.path.getsize(output_path)
        duration = len(audio_segment) / 1000.0
        
        return output_path, file_size, duration