"""
Project VM workspace management router
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...core.config import settings
from ...models.database import User
from ...services.project.application.services import ProjectService
from ..auth import get_current_user_dependency
from .base import get_project_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-vm"])


@router.post("/{project_id}/vm/setup")
async def setup_vm_workspace(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Set up VM workspace for a project"""
    # Check if VM workspace feature is enabled
    if not settings.vm_workspace_enabled:
        raise HTTPException(
            status_code=403, 
            detail="VM workspace feature is currently disabled"
        )
    
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        vm_info = await project_service.setup_vm_workspace(project_id)
        
        return {
            "vm_info": vm_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to setup VM workspace for project {project_id}: {str(e)}")
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
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"[API] ❌ Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"[API] ✅ Project found: {project.name}")
        logger.info(f"[API] 🖥️ VM Status: {project.vm_status}")
        
        command = command_data.get("command", "")
        working_dir = command_data.get("working_directory") or command_data.get("working_dir")
        
        if not command:
            logger.error(f"[API] ❌ No command provided in request")
            raise HTTPException(status_code=400, detail="Command is required")
        
        logger.info(f"[API] 🔨 Extracted command: {command}")
        logger.info(f"[API] 📂 Working directory: {working_dir or 'Not specified'}")
        
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