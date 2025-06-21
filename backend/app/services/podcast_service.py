import os
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydub import AudioSegment
from pydub.effects import normalize
import tempfile
import logging

from ..core.database import db_manager
from ..models.database import PodcastJob, Message, Agent, VoiceConnection, Conversation
from ..models.chat import PodcastGenerationRequest, PodcastJobStatus
from ..services.voice.voice_service import VoiceService
from ..services.voice.domain.entities import VoiceConnection as VoiceConnectionEntity

logger = logging.getLogger(__name__)


class PodcastService:
    def __init__(self):
        self.voice_service = VoiceService()
        self.audio_storage_path = os.environ.get("VOICE_STORAGE_PATH", "/tmp/voice_generation")
        self.max_podcast_length = int(os.environ.get("MAX_PODCAST_LENGTH", "3600"))  # seconds
        
        # Ensure storage directory exists
        os.makedirs(self.audio_storage_path, exist_ok=True)
    
    def create_podcast_job(self, request: PodcastGenerationRequest, user_id: str) -> str:
        """Create a new podcast generation job"""
        with db_manager.get_sync_session() as session:
            job_id = str(uuid.uuid4())
            
            # Check if conversation exists and belongs to user
            conversation = session.query(Conversation).filter(
                Conversation.id == request.conversation_id,
                Conversation.user_id == user_id
            ).first()
            
            if not conversation:
                raise ValueError(f"Conversation {request.conversation_id} not found or access denied")
            
            # Get message count for progress tracking
            message_count = session.query(Message).filter(
                Message.conversation_id == request.conversation_id
            ).filter(
                Message.role == "assistant"  # Only count agent messages
            ).count()
            
            logger.info(f"Creating podcast job for conversation {request.conversation_id} with {message_count} agent messages")
            
            if message_count == 0:
                raise ValueError("No agent messages found in conversation for podcast generation")
            
            job = PodcastJob(
                id=job_id,
                conversation_id=request.conversation_id,
                user_id=user_id,
                status="queued",
                total_messages=message_count,
                processed_messages=0
            )
            
            session.add(job)
            session.commit()
            
            return job_id
    
    def get_job_status(self, job_id: str, user_id: str) -> Optional[PodcastJobStatus]:
        """Get the status of a podcast generation job"""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(
                PodcastJob.id == job_id,
                PodcastJob.user_id == user_id
            ).first()
            
            if not job:
                return None
            
            # Calculate progress
            progress = None
            if job.total_messages and job.total_messages > 0:
                progress = job.processed_messages / job.total_messages
            
            # Generate audio URL if completed
            audio_url = None
            if job.status == "completed" and job.audio_path:
                audio_url = f"/podcast/download/{job_id}"
            
            return PodcastJobStatus(
                job_id=job.id,
                status=job.status,
                progress=progress,
                message=f"Processed {job.processed_messages or 0} of {job.total_messages or 0} messages",
                error_message=job.error_message,
                created_at=job.created_at.isoformat(),
                completed_at=job.completed_at.isoformat() if job.completed_at else None,
                audio_url=audio_url,
                duration_seconds=job.duration_seconds,
                file_size_bytes=job.file_size_bytes
            )
    
    def get_job_download_info(self, job_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get download information for a completed podcast job"""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(
                PodcastJob.id == job_id,
                PodcastJob.user_id == user_id,
                PodcastJob.status == "completed"
            ).first()
            
            if not job or not job.audio_path or not os.path.exists(job.audio_path):
                return None
            
            return {
                "file_path": job.audio_path,
                "file_size_bytes": job.file_size_bytes,
                "duration_seconds": job.duration_seconds,
                "filename": f"podcast_{job.conversation_id[:8]}.mp3"
            }
    
    async def generate_podcast_background(self, job_id: str, request: PodcastGenerationRequest):
        """Background task to generate podcast"""
        logger.info(f"Starting podcast generation for job {job_id}, conversation {request.conversation_id}")
        try:
            await self._update_job_status(job_id, "processing")
            
            # Get conversation messages with agent info
            messages_data = await self._get_conversation_messages(request.conversation_id)
            logger.info(f"Found {len(messages_data) if messages_data else 0} messages for podcast generation")
            
            if not messages_data:
                error_msg = "No messages found in conversation"
                logger.error(f"Job {job_id}: {error_msg}")
                await self._update_job_status(job_id, "failed", error_msg)
                return
            
            # Generate TTS for each message
            audio_segments = []
            processed_count = 0
            failed_messages = []
            
            for msg_data in messages_data:
                try:
                    logger.info(f"Job {job_id}: Processing message {processed_count + 1}/{len(messages_data)} - Agent: {msg_data.get('speaker', 'Unknown')}")
                    
                    # Generate TTS for this message
                    audio_segment = await self._generate_message_tts(msg_data)
                    if audio_segment:
                        audio_segments.append(audio_segment)
                        logger.info(f"Job {job_id}: Successfully generated audio for message {msg_data['id']} - Duration: {len(audio_segment)/1000:.1f}s")
                        
                        # Add pause between speakers (1 second)
                        pause = AudioSegment.silent(duration=1000)
                        audio_segments.append(pause)
                    else:
                        failed_messages.append(msg_data['id'])
                        logger.warning(f"Job {job_id}: No audio generated for message {msg_data['id']}")
                    
                    processed_count += 1
                    await self._update_job_progress(job_id, processed_count)
                    
                except Exception as e:
                    failed_messages.append(msg_data['id'])
                    logger.error(f"Job {job_id}: Failed to generate TTS for message {msg_data['id']}: {e}")
                    continue
            
            if not audio_segments:
                error_msg = f"No audio segments generated. Failed messages: {len(failed_messages)}/{len(messages_data)}"
                logger.error(f"Job {job_id}: {error_msg}")
                await self._update_job_status(job_id, "failed", error_msg)
                return
            
            logger.info(f"Job {job_id}: Generated {len(audio_segments)//2} audio segments, {len(failed_messages)} failed")
            
            # Combine all audio segments
            logger.info(f"Job {job_id}: Combining {len(audio_segments)} audio segments")
            final_audio = await self._combine_audio_segments(audio_segments, request)
            
            # Save to file
            output_path = os.path.join(self.audio_storage_path, f"podcast_{job_id}.mp3")
            logger.info(f"Job {job_id}: Exporting final audio to {output_path}")
            final_audio.export(output_path, format="mp3", bitrate="128k")
            
            # Update job with completion info
            file_size = os.path.getsize(output_path)
            duration = len(final_audio) / 1000.0  # Convert to seconds
            
            logger.info(f"Job {job_id}: Podcast completed - Duration: {duration:.1f}s, Size: {file_size/1024/1024:.1f}MB")
            await self._update_job_completion(job_id, output_path, duration, file_size)
            
        except Exception as e:
            error_msg = f"Podcast generation failed: {str(e)}"
            logger.error(f"Job {job_id}: {error_msg}", exc_info=True)
            await self._update_job_status(job_id, "failed", error_msg)
    
    async def _get_conversation_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get conversation messages with agent voice configuration"""
        with db_manager.get_sync_session() as session:
            # Get messages with agent and voice connection info
            messages = session.query(Message).join(
                Agent, Message.agent_id == Agent.id, isouter=True
            ).join(
                VoiceConnection, Agent.voice_connection_id == VoiceConnection.id, isouter=True
            ).filter(
                Message.conversation_id == conversation_id,
                Message.role == "assistant"  # Only agent messages
            ).order_by(Message.created_at).all()
            
            result = []
            for msg in messages:
                agent = session.query(Agent).filter(Agent.id == msg.agent_id).first()
                voice_connection = None
                
                if agent and agent.voice_connection_id:
                    voice_connection = session.query(VoiceConnection).filter(
                        VoiceConnection.id == agent.voice_connection_id
                    ).first()
                
                result.append({
                    "id": msg.id,
                    "content": msg.content,
                    "speaker": msg.speaker or (agent.name if agent else "Unknown"),
                    "agent_id": msg.agent_id,
                    "agent": agent,
                    "voice_connection": voice_connection
                })
            
            return result
    
    async def _generate_message_tts(self, msg_data: Dict[str, Any]) -> Optional[AudioSegment]:
        """Generate TTS for a single message"""
        voice_connection = msg_data.get("voice_connection")
        agent = msg_data.get("agent")
        
        logger.debug(f"Processing message {msg_data['id']} - Agent: {msg_data.get('speaker')}, Content length: {len(msg_data.get('content', ''))}")
        
        if not agent:
            logger.warning(f"No agent found for message {msg_data['id']}")
            return None
            
        if not hasattr(agent, 'voice_enabled') or not agent.voice_enabled:
            logger.warning(f"Voice not enabled for agent {agent.name} (message {msg_data['id']}). Enable voice in agent settings and assign a voice connection.")
            return None
            
        if not voice_connection:
            logger.warning(f"No voice connection configured for agent {agent.name} (message {msg_data['id']}). Please assign a voice connection to this agent.")
            return None
            
        if not voice_connection.is_active:
            logger.warning(f"Voice connection '{voice_connection.name}' is inactive for agent {agent.name} (message {msg_data['id']})")
            return None
        
        try:
            # Decrypt API key if encrypted
            api_key = voice_connection.api_key
            if voice_connection.api_key_encrypted and api_key:
                from .crypto_service import crypto_service
                try:
                    api_key = crypto_service.decrypt(api_key)
                except Exception as e:
                    logger.error(f"Failed to decrypt API key for voice connection {voice_connection.id}: {e}")
                    return None
            
            # Convert to domain entity
            voice_entity = VoiceConnectionEntity(
                id=voice_connection.id,
                name=voice_connection.name,
                description=voice_connection.description,
                provider=voice_connection.provider,
                provider_type=voice_connection.provider_type,
                voice_id=voice_connection.voice_id,
                speed=voice_connection.speed,
                pitch=voice_connection.pitch,
                stability=voice_connection.stability,
                clarity=voice_connection.clarity,
                style=voice_connection.style,
                api_key=api_key,
                api_key_encrypted=voice_connection.api_key_encrypted,
                base_url=voice_connection.base_url,
                is_active=voice_connection.is_active,
                is_cloud_proxy=voice_connection.is_cloud_proxy,
                user_id=voice_connection.user_id,
                created_at=voice_connection.created_at,
                updated_at=voice_connection.updated_at
            )
            
            # Generate TTS
            tts_result = await self.voice_service.generate_tts(voice_entity, msg_data["content"])
            
            if not tts_result.success or not tts_result.audio_data:
                logger.error(f"TTS generation failed: {tts_result.message}")
                return None
            
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(tts_result.audio_data)
                temp_path = temp_file.name
            
            try:
                # Load audio with pydub
                audio_segment = AudioSegment.from_file(temp_path)
                return audio_segment
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Failed to generate TTS for message {msg_data['id']} (Agent: {msg_data.get('speaker')}): {e}", exc_info=True)
            return None
    
    async def _combine_audio_segments(self, segments: List[AudioSegment], request: PodcastGenerationRequest) -> AudioSegment:
        """Combine audio segments into final podcast"""
        # Combine all segments
        combined = AudioSegment.empty()
        
        # Add intro if requested
        if request.include_intro:
            intro_text = "Welcome to your AI-generated podcast conversation."
            # For now, just add silence - could generate intro TTS later
            intro_pause = AudioSegment.silent(duration=2000)  # 2 seconds
            combined += intro_pause
        
        # Add all message segments
        for segment in segments:
            combined += segment
        
        # Add outro if requested
        if request.include_outro:
            outro_text = "Thank you for listening to this AI-generated conversation."
            # For now, just add silence - could generate outro TTS later
            outro_pause = AudioSegment.silent(duration=2000)  # 2 seconds
            combined += outro_pause
        
        # Normalize audio levels
        combined = normalize(combined)
        
        # Check length limit
        if len(combined) > self.max_podcast_length * 1000:  # Convert to milliseconds
            logger.warning(f"Podcast exceeds maximum length, truncating to {self.max_podcast_length} seconds")
            combined = combined[:self.max_podcast_length * 1000]
        
        return combined
    
    async def _update_job_status(self, job_id: str, status: str, error_message: Optional[str] = None):
        """Update job status"""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.status = status
                if error_message:
                    job.error_message = error_message
                if status in ["completed", "failed"]:
                    job.completed_at = datetime.utcnow()
                session.commit()
    
    async def _update_job_progress(self, job_id: str, processed_count: int):
        """Update job progress"""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.processed_messages = processed_count
                session.commit()
    
    async def _update_job_completion(self, job_id: str, audio_path: str, duration: float, file_size: int):
        """Update job with completion details"""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.status = "completed"
                job.audio_path = audio_path
                job.duration_seconds = duration
                job.file_size_bytes = file_size
                job.completed_at = datetime.utcnow()
                session.commit()


# Global instance
podcast_service = PodcastService()