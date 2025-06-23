"""
Project file operations router
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...models.database import User
from ...services.project.application.services import ProjectService
from ...services.vm_factory import get_vm_service
from ...services.websocket.file_system_service import file_system_service
from ..auth import get_current_user_dependency
from .base import get_project_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-files"])


@router.get("/{project_id}/files")
async def get_vm_files(
    project_id: str,
    path: str = "/workspace",
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get file tree structure from the project's VM"""
    try:
        logger.info(f"Getting VM files for project {project_id}, user {current_user.id}")
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.vm_status != "active":
            logger.warning(f"VM not active for project {project_id}")
            raise HTTPException(status_code=400, detail="VM must be active to list files")
        
        try:
            await project_service.get_vm_tools_for_project(project_id)
        except ValueError as e:
            logger.error(f"Failed to get VM tools for project {project_id}: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to connect to project VM. The VM may need to be restarted. Error: {str(e)}"
            )
        
        vm_service = project_service.underlying_vm_service
        
        if path == "/workspace":
            path = f"/workspace/{project_id}"
        
        file_tree = await vm_service.list_files_recursive(project_id, path)
        
        return {
            "files": file_tree
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get VM files for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/files/create")
async def create_project_file(
    project_id: str,
    file_data: dict,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Create a new file/folder and trigger WebSocket notification"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        if project.vm_status != "active":
            raise HTTPException(status_code=400, detail="VM must be active to create files. Please start the project VM first.")
            
        vm_service = get_vm_service()
        
        file_path = file_data.get("path")
        is_folder = file_data.get("is_folder", False)
        content = file_data.get("content", "")
        
        if not file_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        if file_path.startswith("/workspace"):
            file_path = file_path.replace("/workspace", f"/workspace/{project_id}", 1)
        
        success = False
        if is_folder:
            success = await vm_service.create_directory(project_id, file_path)
        else:
            success = await vm_service.create_file(project_id, file_path, content)
            
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to create {'folder' if is_folder else 'file'}")
            
        return {"success": True, "message": f"{'Folder' if is_folder else 'File'} created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating file/folder for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/files/delete")
async def delete_project_file(
    project_id: str,
    file_data: dict,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Delete a file/folder and trigger WebSocket notification"""
    try:
        logger.info(f"[DELETE_FILE] Starting delete operation for project {project_id}")
        logger.info(f"[DELETE_FILE] User: {current_user.email}")
        logger.info(f"[DELETE_FILE] Raw file_data: {file_data}")
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        if project.vm_status != "active":
            raise HTTPException(status_code=400, detail="VM must be active to delete files. Please start the project VM first.")
            
        vm_service = get_vm_service()
        
        file_path = file_data.get("path")
        is_folder = file_data.get("is_folder", False)
        recursive = file_data.get("recursive", False)
        
        logger.info(f"[DELETE_FILE] Parsed parameters:")
        logger.info(f"  - Original file_path: {file_path}")
        logger.info(f"  - is_folder: {is_folder}")
        logger.info(f"  - recursive: {recursive}")
        
        if not file_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        original_path = file_path
        logger.info(f"[DELETE_FILE] Using original path without conversion: {file_path}")
        
        if not file_path.startswith("/workspace"):
            logger.warning(f"[DELETE_FILE] Path doesn't start with /workspace: {file_path}")
            raise HTTPException(status_code=400, detail="Invalid file path - must be within workspace")
        
        logger.info(f"[DELETE_FILE] Calling VM service delete with final path: {file_path}")
        
        success = False
        if is_folder:
            success = await vm_service.delete_directory(project_id, file_path, recursive)
            logger.info(f"[DELETE_FILE] Directory delete result: {success}")
        else:
            success = await vm_service.delete_file(project_id, file_path)
            logger.info(f"[DELETE_FILE] File delete result: {success}")
            
        if not success:
            logger.error(f"[DELETE_FILE] VM service returned false for path: {file_path}")
            raise HTTPException(status_code=500, detail=f"Failed to delete {'folder' if is_folder else 'file'}")
            
        logger.info(f"[DELETE_FILE] ✅ Successfully deleted {'folder' if is_folder else 'file'}: {file_path}")
        return {"success": True, "message": f"{'Folder' if is_folder else 'File'} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE_FILE] ❌ Error deleting file/folder for project {project_id}: {str(e)}")
        import traceback
        logger.error(f"[DELETE_FILE] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/files/watch")
async def start_file_watching(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Start file system watching for a project"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        print(f"[ROUTE_DEBUG] About to call file_system_service.start_project_file_watcher for {project_id}")
        print(f"[ROUTE_DEBUG] file_system_service instance: {file_system_service}")
        print(f"[ROUTE_DEBUG] file_system_service.active_watchers: {file_system_service.active_watchers}")
        
        await file_system_service.start_project_file_watcher(project_id)
        
        print(f"[ROUTE_DEBUG] Called file_system_service.start_project_file_watcher")
        print(f"[ROUTE_DEBUG] file_system_service.active_watchers after: {file_system_service.active_watchers}")
        
        if project.vm_status != "active":
            return {"success": True, "message": "File watching started (VM not active - watching will begin when VM starts)"}
        else:
            return {"success": True, "message": "File watching started"}
        
    except Exception as e:
        logger.error(f"Error starting file watcher for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/files/watch")
async def stop_file_watching(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Stop file system watching for a project"""
    try:
        await file_system_service.stop_project_file_watcher(project_id)
        return {"success": True, "message": "File watching stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))