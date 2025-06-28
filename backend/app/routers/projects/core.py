"""
Core project CRUD operations router
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...models.database import User
from ...services.project.application.services import ProjectService
from ...services.project.domain.entities import ProjectCreate, ProjectUpdate
from ..auth import get_current_user_dependency
from .base import get_project_service, project_to_dict

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-core"])


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
        
        return {
            "project": project_to_dict(project)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {str(e)}")
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
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
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