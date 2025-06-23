"""
Project monitoring and status service
"""

import logging
from typing import Any, Dict, List

from ...domain.entities import Project, ProjectVMService
from .base import BaseProjectService

logger = logging.getLogger(__name__)


class ProjectMonitoringService(BaseProjectService):
    """
    Project monitoring and health checks
    Handles status reporting and service management
    """

    async def get_project_status(self, project_id: str) -> Dict[str, Any]:
        """
        📊 Get comprehensive project status
        
        Returns VM status, running services, file sync status, etc.
        """
        # Get project without user validation for status check
        project = self.project_repo.get_by_id_only(project_id)
        if not project:
            return {"error": "Project not found"}

        return self.get_project_status_with_project(project)

    def get_project_status_with_project(self, project: Project) -> Dict[str, Any]:
        """Get project status using an already validated project object"""
        # For simulation mode, return empty services and files
        services = []
        files = []

        return {
            "project_id": project.id,
            "vm_status": project.vm_status,
            "vm_url": project.vm_url,
            "container_id": project.vm_container_id,
            "services": [
                {
                    "name": service.service_name,
                    "status": service.status,
                    "url": service.service_url,
                    "port": service.port
                }
                for service in services
            ],
            "files": {
                "total": len(files),
                "synced": len([f for f in files if f.is_synced])
            },
            "last_activity": project.last_vm_activity.isoformat() if project.last_vm_activity else None
        }

    async def get_project_services(self, project_id: str) -> List[ProjectVMService]:
        """Get all running services for a project"""
        # For simulation mode, return empty list
        return []