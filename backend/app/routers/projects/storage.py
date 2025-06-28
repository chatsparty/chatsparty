"""
Project storage file operations router
"""

import logging
import os
import shutil
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db_session
from ...models.database import User, Project, ProjectFile
from ..auth import get_current_user_dependency
from .base import get_project_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-storage"])


class ProjectUpdateRequest(BaseModel):
    instructions: Optional[str] = None


def get_project_storage_path(project_id: str) -> str:
    """Get the storage path for a project"""
    base_path = os.path.join(settings.local_storage_path, "projects", project_id)
    os.makedirs(base_path, exist_ok=True)
    return base_path


@router.get("/{project_id}/files")
async def list_project_files(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """List all files in a project's storage"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get files from database
    files = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.created_at.desc())
    )
    files = files.scalars().all()
    
    return {
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "file_size": f.file_size,
                "mime_type": f.content_type,
                "uploaded_at": f.created_at.isoformat(),
            }
            for f in files
        ]
    }


@router.post("/{project_id}/files/upload")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Upload a file to project storage"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Save file to storage
    storage_path = get_project_storage_path(project_id)
    file_path = os.path.join(storage_path, file.filename)
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Create database record
        db_file = ProjectFile(
            id=str(uuid.uuid4()),
            project_id=project_id,
            filename=file.filename,
            file_path=file_path,
            file_size=len(contents),
            content_type=file.content_type or "application/octet-stream",
            created_at=datetime.utcnow()
        )
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        
        return {
            "id": db_file.id,
            "filename": db_file.filename,
            "file_size": db_file.file_size,
            "mime_type": db_file.content_type,
            "uploaded_at": db_file.created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")


@router.delete("/{project_id}/files/{file_id}")
async def delete_file(
    project_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a file from project storage"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get file record
    file_record = await db.get(ProjectFile, file_id)
    if not file_record or file_record.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        if os.path.exists(file_record.file_path):
            os.remove(file_record.file_path)
    except Exception as e:
        logger.error(f"Failed to delete physical file: {e}")
    
    # Delete database record
    await db.delete(file_record)
    await db.commit()
    
    return {"message": "File deleted successfully"}


@router.get("/{project_id}/files/{file_id}/download")
async def download_file(
    project_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Download a file from project storage"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get file record
    file_record = await db.get(ProjectFile, file_id)
    if not file_record or file_record.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return file
    if not os.path.exists(file_record.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_record.file_path,
        filename=file_record.filename,
        media_type=file_record.content_type
    )


# Add support for project instructions
@router.patch("/{project_id}")
async def update_project_instructions(
    project_id: str,
    request: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Update project instructions"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update instructions
    project.instructions = request.instructions
    await db.commit()
    
    return {"message": "Instructions updated successfully"}