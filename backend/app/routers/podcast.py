from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import FileResponse
import os
import logging

from ..models.chat import (
    PodcastGenerationRequest,
    PodcastGenerationResponse,
    PodcastJobStatus,
)
from ..models.database import User
from ..services.podcast_service import podcast_service
from ..core.error_handler import DatabaseErrorHandler
from .auth import get_current_user_dependency

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/podcast", tags=["podcast"])


@router.post("/generate", response_model=PodcastGenerationResponse)
async def generate_podcast(
    request: PodcastGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_dependency)
):
    """Generate a podcast from a conversation using BackgroundTasks"""
    logger.info(f"Podcast generation request - User: {current_user.id}, Conversation: {request.conversation_id}")
    try:
        job_id = podcast_service.create_podcast_job(request, current_user.id)
        logger.info(f"Created podcast job {job_id} for conversation {request.conversation_id}")
        
        background_tasks.add_task(
            podcast_service.generate_podcast_background,
            job_id,
            request
        )
        logger.info(f"Started background task for podcast job {job_id}")
        
        return PodcastGenerationResponse(
            success=True,
            message="Podcast generation started",
            job_id=job_id,
            estimated_duration_minutes=2.0
        )
        
    except Exception as e:
        logger.error(f"Failed to start podcast generation for conversation {request.conversation_id}: {e}", exc_info=True)
        raise DatabaseErrorHandler.handle_db_error(
            e,
            operation="starting podcast generation",
            user_message="Failed to start podcast generation",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/status/{job_id}", response_model=PodcastJobStatus)
async def get_podcast_status(
    job_id: str,
    current_user: User = Depends(get_current_user_dependency)
):
    """Get the status of a podcast generation job"""
    try:
        job_status = podcast_service.get_job_status(job_id, current_user.id)
        
        if not job_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Podcast job not found"
            )
        
        return job_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get podcast status: {e}")
        raise DatabaseErrorHandler.handle_query_error(e, "podcast job status")


@router.get("/download/{job_id}")
async def download_podcast(
    job_id: str,
    current_user: User = Depends(get_current_user_dependency)
):
    """Download a completed podcast"""
    try:
        download_info = podcast_service.get_job_download_info(job_id, current_user.id)
        
        if not download_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Podcast not found or not ready for download"
            )
        
        file_path = download_info["file_path"]
        filename = download_info["filename"]
        
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Podcast file not found"
            )
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(download_info["file_size_bytes"])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download podcast: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download podcast"
        )


@router.delete("/jobs/{job_id}")
async def delete_podcast_job(
    job_id: str,
    current_user: User = Depends(get_current_user_dependency)
):
    """Delete a podcast job and its associated files"""
    try:
        download_info = podcast_service.get_job_download_info(job_id, current_user.id)
        
        if download_info and download_info["file_path"]:
            try:
                if os.path.exists(download_info["file_path"]):
                    os.unlink(download_info["file_path"])
            except Exception as e:
                logger.warning(f"Failed to delete audio file: {e}")
        
        from ..core.database import db_manager
        with db_manager.get_sync_session() as session:
            from ..models.database import PodcastJob
            job = session.query(PodcastJob).filter(
                PodcastJob.id == job_id,
                PodcastJob.user_id == current_user.id
            ).first()
            
            if job:
                session.delete(job)
                session.commit()
                return {"message": "Podcast job deleted successfully"}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Podcast job not found"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete podcast job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete podcast job"
        )