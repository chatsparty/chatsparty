"""
Core project CRUD operations service
"""

import logging
from typing import List, Optional

from ...domain.entities import Project, ProjectCreate, ProjectUpdate
from .base import BaseProjectService

logger = logging.getLogger(__name__)


class ProjectCrudService(BaseProjectService):
    """
    Core project CRUD operations
    Handles basic project lifecycle without VM or file operations
    """

    async def create_project(
        self,
        project_data: ProjectCreate,
        user_id: str
    ) -> Project:
        """
        Create a new project record in database
        """
        logger.info(f"Creating new project: {project_data.name} for user: {user_id}")
        
        project = self.project_repo.create(project_data, user_id)
        
        logger.info(f"Project created successfully: {project.id}")
        return project

    def get_project(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get project by ID with user ownership check"""
        return self.project_repo.get_by_id(project_id, user_id)

    def get_user_projects(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        return self.project_repo.get_by_user(user_id)

    async def update_project(
        self,
        project_id: str,
        project_data: ProjectUpdate,
        user_id: str
    ) -> Optional[Project]:
        """Update project information"""
        return self.project_repo.update(project_id, project_data, user_id)

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """
        Delete project record from database
        Note: VM and file cleanup should be handled by other services
        """
        logger.info(f"Deleting project: {project_id}")
        
        result = self.project_repo.delete(project_id, user_id)
        
        if result:
            logger.info(f"Project deleted successfully: {project_id}")
        
        return result