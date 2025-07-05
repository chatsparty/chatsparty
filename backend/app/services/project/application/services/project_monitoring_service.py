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
        project = self.project_repo.get_by_id_only(project_id)
        if not project:
            return {"error": "Project not found"}

        return self.get_project_status_with_project(project)

    def get_project_status_with_project(self, project: Project) -> Dict[str, Any]:
        """Get project status using an already validated project object"""
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

    async def get_real_project_status(self, project: Project) -> Dict[str, Any]:
        """Get real-time project status by checking actual container state"""
        
        actual_vm_status = "inactive"
        container_id = project.vm_container_id
        
        try:
            from ....docker.implementations.container_manager import ContainerManager
            container_manager = ContainerManager()
            try:
                container = await container_manager.get_container(project.id)
                
                if container:
                    container_info = await container.show()
                    container_status = container_info["State"]["Status"]
                    container_id = container_info["Id"][:12]
                    
                    if container_status == 'running':
                        actual_vm_status = "active"
                    elif container_status in ['exited', 'stopped']:
                        actual_vm_status = "stopped"
                    else:
                        actual_vm_status = "inactive"
                else:
                    logger.info(f"Container not found for project {project.id} - marking as inactive")
                    actual_vm_status = "inactive"
                    container_id = None
                    
            finally:
                await container_manager.close()
                
        except Exception as e:
            logger.error(f"Error checking container status for project {project.id}: {e}")
            actual_vm_status = "inactive"
            container_id = project.vm_container_id
        
        if actual_vm_status != project.vm_status or (container_id != project.vm_container_id):
            logger.info(f"Updating VM status for project {project.id}: {project.vm_status} -> {actual_vm_status}")
            if container_id != project.vm_container_id:
                logger.info(f"Updating container ID for project {project.id}: {project.vm_container_id} -> {container_id}")
            
            self.project_repo.update_vm_info_detailed(
                project.id, 
                container_id or "", 
                actual_vm_status, 
                project.vm_configuration or {}
            )
            project.vm_status = actual_vm_status
            if container_id != project.vm_container_id:
                project.vm_container_id = container_id

        services = []
        files = []

        return {
            "project_id": project.id,
            "vm_status": actual_vm_status,
            "vm_url": project.vm_url,
            "container_id": container_id,
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

    async def get_project_services(self, _project_id: str) -> List[ProjectVMService]:
        """Get all running services for a project"""
        return []