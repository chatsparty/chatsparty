"""Podcast generation orchestrator - coordinates all podcast generation activities."""
import os
import logging
from typing import Optional, Dict, Any

try:
    from .audio_handler import AudioSegment
except ImportError:
    from pydub import AudioSegment

from ...models.chat import PodcastGenerationRequest, PodcastJobStatus
from ...services.voice_assignment import dynamic_voice_assignment_service
from .job_manager import PodcastJobManager
from .audio_processor import AudioProcessor
from .tts_generator import TTSGenerator
from .message_processor import MessageProcessor
from .file_manager import PodcastFileManager

logger = logging.getLogger(__name__)


class PodcastOrchestrator:
    """Main orchestrator that coordinates podcast generation across multiple services."""
    
    def __init__(self):
        self.audio_storage_path = os.environ.get("VOICE_STORAGE_PATH", "/tmp/voice_generation")
        self.max_podcast_length = int(os.environ.get("MAX_PODCAST_LENGTH", "3600"))
        
        self.job_manager = PodcastJobManager()
        self.audio_processor = AudioProcessor(self.max_podcast_length)
        self.tts_generator = TTSGenerator(self.audio_storage_path)
        self.message_processor = MessageProcessor()
        self.file_manager = PodcastFileManager(self.audio_storage_path)
    
    def create_podcast_job(self, request: PodcastGenerationRequest, user_id: str) -> str:
        """Create a new podcast generation job."""
        return self.job_manager.create_job(request, user_id)
    
    def get_job_status(self, job_id: str, user_id: str) -> Optional[PodcastJobStatus]:
        """Get the status of a podcast generation job."""
        return self.job_manager.get_job_status(job_id, user_id)
    
    def get_job_download_info(self, job_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get download information for a completed podcast job."""
        return self.file_manager.get_download_info(job_id, user_id)
    
    async def generate_podcast_background(self, job_id: str, request: PodcastGenerationRequest):
        """Background task to generate podcast."""
        logger.info(f"Starting podcast generation for job {job_id}, conversation {request.conversation_id}")
        
        await self.tts_generator.update_available_voices_cache("google")
        
        debug_dir = self.file_manager.create_debug_directory(job_id)
        
        try:
            self.job_manager.update_status(job_id, "processing")
            
            messages_data = self.message_processor.get_conversation_messages(request.conversation_id)
            logger.info(f"Found {len(messages_data)} messages for podcast generation")
            
            if not messages_data:
                error_msg = "No messages found in conversation"
                logger.error(f"Job {job_id}: {error_msg}")
                self.job_manager.update_status(job_id, "failed", error_msg)
                return
            
            audio_segments = await self._generate_audio_segments(
                messages_data, request.conversation_id, job_id, debug_dir
            )
            
            if not audio_segments:
                error_msg = "No audio segments generated"
                logger.error(f"Job {job_id}: {error_msg}")
                self.job_manager.update_status(job_id, "failed", error_msg)
                return
            
            speech_segment_count = sum(1 for i, _ in enumerate(audio_segments) if i % 2 == 0) if len(audio_segments) > 0 else 0
            logger.info(f"Job {job_id}: Generated {speech_segment_count} audio segments with transitions")
            
            logger.info(f"Job {job_id}: Combining {len(audio_segments)} audio segments")
            final_audio = await self.audio_processor.combine_segments(audio_segments, request)
            
            self._save_debug_audio(final_audio, debug_dir, job_id)
            
            output_format = "wav" if hasattr(AudioSegment, 'from_bytes') else "mp3"
            output_path = self.file_manager.get_output_path(job_id, output_format)
            output_path, file_size, duration = self.file_manager.save_audio_file(final_audio, output_path)
            
            logger.info(f"Job {job_id}: Podcast completed - Duration: {duration:.1f}s, Size: {file_size/1024/1024:.1f}MB")
            
            self.job_manager.complete_job(job_id, output_path, duration, file_size)
            
            export_sample_rate = getattr(final_audio, 'frame_rate', 'unknown')
            self.file_manager.create_debug_summary(
                debug_dir, job_id, duration, export_sample_rate, audio_segments, output_path
            )
            
            dynamic_voice_assignment_service.clear_conversation_voices(request.conversation_id)
            
        except Exception as e:
            error_msg = f"Podcast generation failed: {str(e)}"
            logger.error(f"Job {job_id}: {error_msg}", exc_info=True)
            self.job_manager.update_status(job_id, "failed", error_msg)
            
            dynamic_voice_assignment_service.clear_conversation_voices(request.conversation_id)
    
    async def _generate_audio_segments(
        self, 
        messages_data: list, 
        conversation_id: str, 
        job_id: str, 
        debug_dir: str
    ) -> list:
        """Generate TTS audio segments for all messages."""
        audio_segments = []
        processed_count = 0
        failed_messages = []
        
        for msg_data in messages_data:
            try:
                logger.info(f"Job {job_id}: Processing message {processed_count + 1}/{len(messages_data)} - Agent: {msg_data.get('speaker', 'Unknown')}")
                
                audio_segment = await self.tts_generator.generate_for_message(
                    msg_data, conversation_id, job_id
                )
                
                if audio_segment:
                    audio_segment = self.audio_processor.apply_fade(audio_segment, fade_in_ms=20, fade_out_ms=20)
                    
                    segment_path = os.path.join(debug_dir, f"segment_{len(audio_segments):03d}_msg{msg_data['id']}_speech.wav")
                    audio_segment.export(segment_path, format="wav")
                    logger.info(f"Job {job_id}: Saved individual segment to {segment_path}")
                    
                    audio_segments.append(audio_segment)
                    logger.info(f"Job {job_id}: Successfully generated audio for message {msg_data['id']} - Duration: {len(audio_segment)/1000:.1f}s")
                    
                    
                    if processed_count < len(messages_data) - 1:
                        pause = self.audio_processor.create_pause(50, getattr(audio_segment, 'sample_rate', 44100))
                        audio_segments.append(pause)
                        logger.info(f"Job {job_id}: Added 50ms transition")
                else:
                    failed_messages.append(msg_data['id'])
                    logger.warning(f"Job {job_id}: No audio generated for message {msg_data['id']}")
                
                processed_count += 1
                self.job_manager.update_progress(job_id, processed_count)
                
            except Exception as e:
                failed_messages.append(msg_data['id'])
                logger.error(f"Job {job_id}: Failed to generate TTS for message {msg_data['id']}: {e}")
                continue
        
        if failed_messages:
            logger.warning(f"Job {job_id}: Failed to generate audio for {len(failed_messages)} messages: {failed_messages}")
        
        return audio_segments
    
    def _save_debug_audio(self, final_audio, debug_dir: str, job_id: str):
        """Save debug audio files."""
        pre_norm_path = os.path.join(debug_dir, "combined_before_normalization.wav")
        if hasattr(final_audio, 'data'):
            import copy
            final_audio_copy = copy.deepcopy(final_audio)
        else:
            final_audio_copy = AudioSegment(
                data=final_audio.raw_data,
                sample_width=final_audio.sample_width,
                frame_rate=final_audio.frame_rate,
                channels=final_audio.channels
            )
        
        final_audio_copy.export(pre_norm_path, format="wav")
        logger.info(f"Job {job_id}: Saved pre-normalization audio to {pre_norm_path}")
        
        export_duration = len(final_audio) / 1000.0
        export_sample_rate = getattr(final_audio, 'frame_rate', 'unknown')
        export_channels = getattr(final_audio, 'channels', 'unknown')
        export_sample_width = getattr(final_audio, 'sample_width', 'unknown')
        
        logger.info(f"Job {job_id}: Final audio properties before export:")
        logger.info(f"  - Duration: {export_duration:.2f}s")
        logger.info(f"  - Sample rate: {export_sample_rate}Hz")
        logger.info(f"  - Channels: {export_channels}")
        logger.info(f"  - Sample width: {export_sample_width}")