"""
Project Management API Routes
Provides endpoints for creating and managing projects with full VM workspaces
"""

import logging
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_sync_db_session
from ..models.database import User
from ..services.vm_factory import get_vm_service
from ..services.project.application.project_service import ProjectService
from ..services.project.domain.entities import ProjectCreate, ProjectUpdate
from ..services.project.infrastructure.project_repository import ProjectRepository
from ..services.project.infrastructure.project_file_repository import ProjectFileRepository
from ..services.project.infrastructure.project_vm_service_repository import ProjectVMServiceRepository
from .auth import get_current_user_dependency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


def project_to_dict(project) -> Dict:
    """Convert project entity to dictionary for JSON response"""
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "user_id": project.user_id,
        "vm_container_id": project.vm_container_id,
        "vm_status": project.vm_status,
        "vm_config": project.vm_config,
        "vm_url": project.vm_url,
        "storage_mount_path": project.storage_mount_path,
        "storage_config": project.storage_config,
        "is_active": project.is_active,
        "auto_sync_files": project.auto_sync_files,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "last_vm_activity": project.last_vm_activity.isoformat() if project.last_vm_activity else None
    }


# Singleton instance for project service
_project_service_instance = None

def get_project_service(db: Session = Depends(get_sync_db_session)) -> ProjectService:
    """Dependency injection for project service with singleton pattern"""
    global _project_service_instance
    
    if _project_service_instance is None:
        project_repo = ProjectRepository(db)
        file_repo = ProjectFileRepository(db)
        vm_service_repo = ProjectVMServiceRepository(db)
        vm_service = get_vm_service()  # Use factory to get VM service
        
        _project_service_instance = ProjectService(
            project_repo=project_repo,
            file_repo=file_repo,
            vm_service_repo=vm_service_repo,
            vm_service=vm_service
        )
    
    return _project_service_instance


@router.post("/")
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Create a new project"""
    try:
        project = await project_service.create_project(
            project_data=project_data,
            user_id=current_user.id
        )
        
        # Convert domain entity to dict for JSON response
        return {
            "project": project_to_dict(project)
        }
    except Exception as e:
        logger.error(f"Failed to create project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_user_projects(
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get all projects for the current user"""
    try:
        logger.info(f"Getting projects for user {current_user.id}")
        projects = project_service.get_user_projects(user_id=current_user.id)
        logger.info(f"Found {len(projects)} projects for user {current_user.id}")
        
        # Convert domain entities to dict for JSON response
        project_dicts = [project_to_dict(project) for project in projects]
        for project_dict in project_dicts:
            logger.info(f"Project: {project_dict['id']} belongs to user: {project_dict['user_id']}")
        
        return {
            "projects": project_dicts
        }
    except Exception as e:
        logger.error(f"Failed to get user projects: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get a specific project"""
    try:
        project = project_service.get_project(
            project_id=project_id,
            user_id=current_user.id
        )
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Convert domain entity to dict for JSON response
        return {
            "project": project_to_dict(project)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/vm/setup")
async def setup_vm_workspace(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Set up VM workspace for a project"""
    try:
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Setup VM workspace
        vm_info = await project_service.setup_vm_workspace(project_id)
        
        return {
            "vm_info": vm_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to setup VM workspace for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/status")
async def get_project_status(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get project status"""
    try:
        logger.info(f"Getting status for project {project_id}, user {current_user.id}")
        
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"Project {project_id} found, getting status")
        
        # Get project status - pass the project we already validated
        status = project_service.get_project_status_with_project(project)
        
        return {
            "status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project status for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/services")
async def get_project_services(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get all services for a project"""
    try:
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get project services
        services = await project_service.get_project_services(project_id)
        
        return {
            "services": [
                {
                    "id": service.id,
                    "service_name": service.service_name,
                    "service_type": service.service_type,
                    "command": service.command,
                    "port": service.port,
                    "status": service.status,
                    "process_id": service.process_id,
                    "service_url": service.service_url,
                    "auto_start": service.auto_start,
                    "restart_policy": service.restart_policy,
                    "created_at": service.created_at.isoformat() if service.created_at else None,
                    "last_started_at": service.last_started_at.isoformat() if service.last_started_at else None
                }
                for service in services
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project services for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Delete a project"""
    try:
        logger.info(f"Deleting project {project_id} for user {current_user.id}")
        
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete the project
        success = await project_service.delete_project(project_id, current_user.id)
        
        if success:
            logger.info(f"Project {project_id} deleted successfully")
            return {
                "message": "Project deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete project")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/vm/command")
async def execute_vm_command(
    project_id: str,
    command_data: dict,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Execute a command in the project's VM"""
    try:
        logger.info(f"[API] 🚀 VM command request received")
        logger.info(f"[API] 📋 Project ID: {project_id}")
        logger.info(f"[API] 👤 User ID: {current_user.id}")
        logger.info(f"[API] 📦 Command data: {command_data}")
        
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"[API] ❌ Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"[API] ✅ Project found: {project.name}")
        logger.info(f"[API] 🖥️ VM Status: {project.vm_status}")
        
        # Extract command and working directory
        command = command_data.get("command", "")
        working_dir = command_data.get("working_directory") or command_data.get("working_dir")
        
        if not command:
            logger.error(f"[API] ❌ No command provided in request")
            raise HTTPException(status_code=400, detail="Command is required")
        
        logger.info(f"[API] 🔨 Extracted command: {command}")
        logger.info(f"[API] 📂 Working directory: {working_dir or 'Not specified'}")
        
        # Execute command in VM
        logger.info(f"[API] ➡️ Forwarding to project service...")
        result = await project_service.execute_agent_command(
            project_id=project_id,
            command=command,
            working_dir=working_dir
        )
        
        logger.info(f"[API] ⬅️ Received result from project service")
        logger.info(f"[API] 📊 Success: {result.get('success', False)}")
        logger.info(f"[API] 📊 Exit code: {result.get('exit_code', 'N/A')}")
        
        return {
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute VM command for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
        
        # Verify project exists and user owns it
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if VM is active
        if project.vm_status != "active":
            logger.warning(f"VM not active for project {project_id}")
            raise HTTPException(status_code=400, detail="VM must be active to list files")
        
        # Ensure VM tools are available (this will reconnect if needed)
        try:
            await project_service.get_vm_tools_for_project(project_id)
        except ValueError as e:
            logger.error(f"Failed to get VM tools for project {project_id}: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to connect to project VM. The VM may need to be restarted. Error: {str(e)}"
            )
        
        # Get file tree from VM service
        vm_service = project_service.vm_service
        
        # Build workspace path if not provided
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
