from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any
import os
import time

from ..models.database import User
from ..services.file_service import get_file_service, FileService
from ..services.ai import get_ai_service, AIServiceFacade
from .auth import get_current_user_dependency

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    file_service: FileService = Depends(get_file_service)
) -> Dict[str, Any]:
    """Upload a file temporarily and return file information"""
    try:
        file_path = await file_service.save_file(file)
        
        return {
            "success": True,
            "message": "File uploaded successfully (temporary)",
            "file_id": os.path.basename(file_path).split('.')[0],
            "filename": file.filename,
            "size": file.size,
            "content_type": file.content_type,
            "temporary_path": file_path
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/upload-persistent")
async def upload_file_persistent(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    file_service: FileService = Depends(get_file_service)
) -> Dict[str, Any]:
    """Upload a file to persistent storage and return file information"""
    try:
        metadata = {
            "user_id": current_user.id,
            "uploaded_at": str(int(time.time())),
            "original_filename": file.filename
        }
        
        file_info = await file_service.save_file_to_storage(file, metadata)
        
        return {
            "success": True,
            "message": "File uploaded to persistent storage",
            "file_info": file_info
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persistent file upload failed: {str(e)}")


@router.post("/extract-content")
async def extract_file_content(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    file_service: FileService = Depends(get_file_service),
    ai_service: AIServiceFacade = Depends(get_ai_service)
) -> Dict[str, Any]:
    """Extract and enhance content from uploaded file using AI"""
    file_path = None
    try:
        file_path = await file_service.save_file(file)
        
        content = await file_service.extract_content_with_ai(file_path, current_user.id, ai_service)
        
        return {
            "success": True,
            "message": "Content extracted successfully",
            "filename": file.filename,
            "content": content,
            "content_length": len(content)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content extraction failed: {str(e)}")
    finally:
        if file_path:
            file_service.cleanup_file(file_path)