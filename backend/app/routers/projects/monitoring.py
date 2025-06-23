"""
Project monitoring and status router
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...models.database import User
from ...services.project.application.services import ProjectService
from ..auth import get_current_user_dependency
from .base import get_project_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-monitoring"])


@router.get("/{project_id}/status")
async def get_project_status(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get project status"""
    try:
        logger.info(f"Getting status for project {project_id}, user {current_user.id}")
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"Project {project_id} found, getting status")
        
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
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
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