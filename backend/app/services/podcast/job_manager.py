"""Podcast job management - handles job creation, status tracking, and updates."""
import uuid
from datetime import datetime
from typing import Optional
import logging

from ...core.database import db_manager
from ...models.database import PodcastJob, Message, Conversation
from ...models.chat import PodcastGenerationRequest, PodcastJobStatus

logger = logging.getLogger(__name__)


class PodcastJobManager:
    """Manages podcast generation jobs lifecycle."""
    
    def create_job(self, request: PodcastGenerationRequest, user_id: str) -> str:
        """Create a new podcast generation job."""
        with db_manager.get_sync_session() as session:
            job_id = str(uuid.uuid4())
            
            conversation = session.query(Conversation).filter(
                Conversation.id == request.conversation_id,
                Conversation.user_id == user_id
            ).first()
            
            if not conversation:
                raise ValueError(f"Conversation {request.conversation_id} not found or access denied")
            
            message_count = session.query(Message).filter(
                Message.conversation_id == request.conversation_id
            ).filter(
                Message.role == "assistant"
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
        """Get the status of a podcast generation job."""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(
                PodcastJob.id == job_id,
                PodcastJob.user_id == user_id
            ).first()
            
            if not job:
                return None
            
            progress = None
            if job.total_messages and job.total_messages > 0:
                progress = job.processed_messages / job.total_messages
            
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
    
    def update_status(self, job_id: str, status: str, error_message: Optional[str] = None):
        """Update job status."""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.status = status
                if error_message:
                    job.error_message = error_message
                if status in ["completed", "failed"]:
                    job.completed_at = datetime.utcnow()
                session.commit()
    
    def update_progress(self, job_id: str, processed_count: int):
        """Update job progress."""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.processed_messages = processed_count
                session.commit()
    
    def complete_job(self, job_id: str, audio_path: str, duration: float, file_size: int):
        """Update job with completion details."""
        with db_manager.get_sync_session() as session:
            job = session.query(PodcastJob).filter(PodcastJob.id == job_id).first()
            if job:
                job.status = "completed"
                job.audio_path = audio_path
                job.duration_seconds = duration
                job.file_size_bytes = file_size
                job.completed_at = datetime.utcnow()
                session.commit()