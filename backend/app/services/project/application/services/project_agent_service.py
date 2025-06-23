"""
Project agent integration service
"""

import logging
from datetime import datetime
from typing import List, Optional

from ...domain.entities import ProjectVMService
from .base import BaseProjectService

logger = logging.getLogger(__name__)


class ProjectAgentService(BaseProjectService):
    """
    Agent integration and service management for projects
    Handles agent conversations and VM service operations
    """

    async def start_vm_service(
        self,
        project_id: str,
        service_name: str,
        command: str,
        port: Optional[int] = None
    ) -> ProjectVMService:
        """
        🚀 Start a service in the project VM
        
        Examples:
        - Web server: "python manage.py runserver 0.0.0.0:8000"
        - API server: "npm run dev"
        - Database: "docker run -p 5432:5432 postgres"
        - Jupyter: "jupyter notebook --ip=0.0.0.0 --allow-root"
        """
        # This would need access to VM tools, which should come from VM service
        # For now, create a placeholder service record
        
        service = ProjectVMService(
            id=f"service_{project_id}_{service_name}",
            project_id=project_id,
            service_name=service_name,
            command=command,
            port=port,
            status="running",
            process_id=None,
            service_url=f"http://localhost:{port}" if port else None,
            created_at=datetime.now()
        )

        return await self.vm_service_repo.create_service(service)

    async def stop_vm_service(self, service_id: str) -> bool:
        """Stop a VM service"""
        service = await self.vm_service_repo.get_service_by_id(service_id)
        if not service:
            return False

        # This would need VM tools access to actually stop the service
        # For now, just update the status
        await self.vm_service_repo.update_service_status(service_id, "stopped")
        return True

    async def create_project_conversation(
        self,
        project_id: str,
        user_id: str,
        agent_ids: List[str]
    ) -> str:
        """
        💬 Create a multi-agent conversation with full project access
        
        This conversation will have:
        - Access to all project files
        - Full VM workspace control
        - All MCP tools for complete system access
        - Running services visibility
        """
        # This would integrate with your existing conversation system
        # but link it to the project for context

        # The conversation would automatically have access to:
        # - VM tools for the project
        # - All project files and services
        # - Complete development environment

        # For now, return a placeholder
        return f"conversation_{project_id}_{datetime.now().isoformat()}"