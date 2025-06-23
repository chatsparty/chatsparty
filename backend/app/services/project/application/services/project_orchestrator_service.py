"""
Main project service that orchestrates all project operations
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ....vm_factory import get_vm_service
from ...domain.entities import (
    Project,
    ProjectCreate,
    ProjectFile,
    ProjectUpdate,
    ProjectVMService,
)
from ...domain.interfaces import (
    ProjectFileRepositoryInterface,
    ProjectRepositoryInterface,
    ProjectVMServiceRepositoryInterface,
)
from .project_agent_service import ProjectAgentService
from .project_crud_service import ProjectCrudService
from .project_file_service import ProjectFileService
from .project_monitoring_service import ProjectMonitoringService
from .project_vm_service import ProjectVMService

logger = logging.getLogger(__name__)


class ProjectOrchestratorService:
    """
    🚀 PROJECT ORCHESTRATOR SERVICE - FULL VM WORKSPACE FOR AGENTS
    
    This service provides:
    - Complete project lifecycle management
    - Full VM workspace with integration  
    - File synchronization between storage and VM
    - MCP tools integration for agent access
    - Multi-agent conversation support with project context
    
    This orchestrator delegates to specialized services for different concerns.
    """

    def __init__(
        self,
        project_repo: ProjectRepositoryInterface,
        file_repo: ProjectFileRepositoryInterface,
        vm_service_repo: ProjectVMServiceRepositoryInterface,
        vm_service=None
    ):
        self.crud_service = ProjectCrudService(project_repo, file_repo, vm_service_repo, vm_service)
        self.vm_service = ProjectVMService(project_repo, file_repo, vm_service_repo, vm_service)
        self.file_service = ProjectFileService(project_repo, file_repo, vm_service_repo, vm_service)
        self.monitoring_service = ProjectMonitoringService(project_repo, file_repo, vm_service_repo, vm_service)
        self.agent_service = ProjectAgentService(project_repo, file_repo, vm_service_repo, vm_service)
        
        self.underlying_vm_service = vm_service or get_vm_service()


    async def create_project(
        self,
        project_data: ProjectCreate,
        user_id: str
    ) -> Project:
        """
        🏗️ Create a new project with VM workspace
        
        This automatically:
        1. Creates the project in database
        2. Sets up VM workspace (Docker container) if auto_setup_vm is enabled
        3. Initializes storage mount
        4. Prepares MCP tools for agents
        """
        project = await self.crud_service.create_project(project_data, user_id)
        
        if hasattr(project_data, 'auto_setup_vm') and project_data.auto_setup_vm:
            await self.vm_service.setup_vm_workspace(project.id)
        
        return project

    def get_project(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get project by ID with user ownership check"""
        return self.crud_service.get_project(project_id, user_id)

    def get_user_projects(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        return self.crud_service.get_user_projects(user_id)

    async def update_project(
        self,
        project_id: str,
        project_data: ProjectUpdate,
        user_id: str
    ) -> Optional[Project]:
        """Update project information"""
        return await self.crud_service.update_project(project_id, project_data, user_id)

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """
        🗑️ Delete project and cleanup all resources
        
        This will:
        1. Stop and destroy VM workspace
        2. Clean up storage files
        3. Remove MCP tool access
        4. Delete database records
        """
        await self.vm_service.cleanup_vm_workspace(project_id)
        
        return await self.crud_service.delete_project(project_id, user_id)


    async def setup_vm_workspace(self, project_id: str) -> Dict[str, Any]:
        """Set up complete VM workspace for the project"""
        return await self.vm_service.setup_vm_workspace(project_id)

    async def cleanup_vm_workspace(self, project_id: str) -> bool:
        """Clean up VM workspace and stop all services"""
        return await self.vm_service.cleanup_vm_workspace(project_id)


    async def get_vm_tools_for_project(self, project_id: str):
        """Get MCP tools that give agents FULL computer access"""
        return await self.vm_service.get_vm_tools_for_project(project_id)

    async def execute_agent_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute command in project VM on behalf of an agent"""
        return await self.vm_service.execute_agent_command(project_id, command, working_dir)


    async def add_files_to_project(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> List[ProjectFile]:
        """Add files to project and sync to VM"""
        return await self.file_service.add_files_to_project(project_id, files)

    async def sync_files_to_vm(self, project_id: str) -> bool:
        """Sync all project files to VM workspace"""
        return await self.file_service.sync_files_to_vm(project_id)


    async def start_vm_service(
        self,
        project_id: str,
        service_name: str,
        command: str,
        port: Optional[int] = None
    ) -> ProjectVMService:
        """Start a service in the project VM"""
        return await self.agent_service.start_vm_service(project_id, service_name, command, port)

    async def stop_vm_service(self, service_id: str) -> bool:
        """Stop a VM service"""
        return await self.agent_service.stop_vm_service(service_id)

    async def get_project_services(self, project_id: str) -> List[ProjectVMService]:
        """Get all running services for a project"""
        return await self.monitoring_service.get_project_services(project_id)


    async def create_project_conversation(
        self,
        project_id: str,
        user_id: str,
        agent_ids: List[str]
    ) -> str:
        """Create a multi-agent conversation with full project access"""
        return await self.agent_service.create_project_conversation(project_id, user_id, agent_ids)


    async def get_project_status(self, project_id: str) -> Dict[str, Any]:
        """Get comprehensive project status"""
        return await self.monitoring_service.get_project_status(project_id)

    def get_project_status_with_project(self, project: Project) -> Dict[str, Any]:
        """Get project status using an already validated project object"""
        return self.monitoring_service.get_project_status_with_project(project)