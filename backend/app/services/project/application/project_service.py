"""
Project Application Service - Core business logic for project management with VM integration
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ...vm_factory import get_vm_service
from ...mcp.vm_tools import ProjectVMTools
from ...storage.storage_factory import get_storage_provider
from ..domain.entities import (
    Project,
    ProjectCreate,
    ProjectFile,
    ProjectUpdate,
    ProjectVMService,
)
from ..domain.interfaces import (
    ProjectFileRepositoryInterface,
    ProjectRepositoryInterface,
    ProjectVMServiceRepositoryInterface,
)

logger = logging.getLogger(__name__)


class ProjectService:
    """
    🚀 PROJECT SERVICE - FULL VM WORKSPACE FOR AGENTS

    This service provides:
    - Complete project lifecycle management
    - Full VM workspace with E2B integration  
    - File synchronization between storage and VM
    - MCP tools integration for agent access
    - Multi-agent conversation support with project context
    """

    def __init__(
        self,
        project_repo: ProjectRepositoryInterface,
        file_repo: ProjectFileRepositoryInterface,
        vm_service_repo: ProjectVMServiceRepositoryInterface,
        vm_service=None  # Will use factory if not provided
    ):
        self.project_repo = project_repo
        self.file_repo = file_repo
        self.vm_service_repo = vm_service_repo
        self.vm_service = vm_service or get_vm_service()
        self.storage_provider = get_storage_provider()

        # Active VM tools for each project
        self.active_vm_tools: Dict[str, ProjectVMTools] = {}

    # ============= PROJECT MANAGEMENT =============

    async def create_project(
        self,
        project_data: ProjectCreate,
        user_id: str
    ) -> Project:
        """
        🏗️ Create a new project with VM workspace

        This automatically:
        1. Creates the project in database
        2. Sets up VM workspace (E2B sandbox)
        3. Initializes storage mount
        4. Prepares MCP tools for agents
        """
        logger.info(
            f"Creating new project: {project_data.name} for user: {user_id}")

        # Create project record
        project = self.project_repo.create(project_data, user_id)

        # Initialize VM workspace if auto-setup is enabled
        if hasattr(project_data, 'auto_setup_vm') and project_data.auto_setup_vm:
            await self.setup_vm_workspace(project.id)

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
        🗑️ Delete project and cleanup all resources

        This will:
        1. Stop and destroy VM workspace
        2. Clean up storage files
        3. Remove MCP tool access
        4. Delete database records
        """
        logger.info(f"Deleting project: {project_id}")

        # Cleanup VM workspace first
        await self.cleanup_vm_workspace(project_id)

        # Remove from active tools
        if project_id in self.active_vm_tools:
            del self.active_vm_tools[project_id]

        # Delete from database
        result = self.project_repo.delete(project_id, user_id)

        if result:
            logger.info(f"Project deleted successfully: {project_id}")

        return result

    # ============= VM WORKSPACE MANAGEMENT =============

    async def setup_vm_workspace(self, project_id: str) -> Dict[str, Any]:
        """
        🖥️ Set up complete VM workspace for the project

        This creates a full Linux environment where agents can:
        - Install any software they need
        - Run development servers
        - Execute complex workflows
        - Access all project files
        """
        logger.info(f"[PROJECT_SERVICE] 🚀 Starting VM workspace setup for project: {project_id}")
        logger.info(f"[PROJECT_SERVICE] VM provider: {type(self.vm_service).__name__}")

        try:
            # Update project status to starting
            logger.info(f"[PROJECT_SERVICE] 📝 Updating project {project_id} status to 'starting'")
            self.project_repo.update_vm_status(project_id, "starting")
            logger.info(f"[PROJECT_SERVICE] ✅ Project status updated to 'starting'")

            # Create VM sandbox with timeout
            logger.info(f"[PROJECT_SERVICE] 🔧 Creating VM sandbox for project {project_id}")
            import asyncio
            vm_info = await asyncio.wait_for(
                self.vm_service.create_project_sandbox(project_id),
                timeout=120  # 2 minute timeout
            )
            logger.info(f"[PROJECT_SERVICE] ✅ VM sandbox created successfully: {vm_info}")

            # Update project with VM information
            logger.info(f"[PROJECT_SERVICE] 📝 Updating project {project_id} status to 'active'")
            update_success = self.project_repo.update_vm_info_detailed(
                project_id=project_id,
                sandbox_id=vm_info["sandbox_id"],
                vm_status="active",
                vm_config=vm_info
            )
            
            if update_success:
                logger.info(f"[PROJECT_SERVICE] ✅ Project {project_id} status updated to 'active'")
                logger.info(f"[PROJECT_SERVICE] 📋 Sandbox ID: {vm_info['sandbox_id']}")
                
                # Verify the update by reading back the project
                updated_project = self.project_repo.get_by_id_only(project_id)
                if updated_project:
                    logger.info(f"[PROJECT_SERVICE] 🔍 Verified project status: {updated_project.vm_status}")
                    logger.info(f"[PROJECT_SERVICE] 🔍 Verified sandbox ID: {updated_project.e2b_sandbox_id}")
                else:
                    logger.error(f"[PROJECT_SERVICE] ❌ Could not verify project update")
            else:
                logger.error(f"[PROJECT_SERVICE] ❌ Failed to update project status to 'active'")

            # Initialize VM tools for agents
            logger.info(f"[PROJECT_SERVICE] 🔧 Creating VM tools for project {project_id}")
            self.active_vm_tools[project_id] = ProjectVMTools(
                self.vm_service,
                project_id
            )
            logger.info(f"[PROJECT_SERVICE] ✅ VM tools created successfully for project {project_id}")
            logger.info(f"[PROJECT_SERVICE] 📊 Active VM tools count: {len(self.active_vm_tools)}")

            # Skip file sync for now to speed up the process
            # await self.sync_files_to_vm(project_id)

            logger.info(f"[PROJECT_SERVICE] 🎉 ✅ VM workspace ready for project: {project_id}")
            logger.info(f"[PROJECT_SERVICE] 🔗 VM URL: {vm_info.get('vm_url', 'N/A')}")
            logger.info(f"[PROJECT_SERVICE] 📂 Workspace path: {vm_info.get('workspace_path', '/workspace')}")
            return vm_info

        except asyncio.TimeoutError:
            logger.error(f"[PROJECT_SERVICE] ⏰ ❌ Timeout creating VM workspace for {project_id} (120s limit)")
            self.project_repo.update_vm_status(project_id, "error")
            raise Exception("VM creation timed out")
        except Exception as e:
            logger.error(f"[PROJECT_SERVICE] ❌ Failed to setup VM workspace for {project_id}: {str(e)}")
            logger.error(f"[PROJECT_SERVICE] Error type: {type(e).__name__}")
            self.project_repo.update_vm_status(project_id, "error")
            raise

    async def cleanup_vm_workspace(self, project_id: str) -> bool:
        """🧹 Clean up VM workspace and stop all services"""
        try:
            # Stop VM services first (simulation mode - no services to stop)
            services = []

            # Destroy E2B sandbox
            await self.vm_service.destroy_project_sandbox(project_id)

            # Update status
            self.project_repo.update_vm_status(project_id, "stopped")

            return True

        except Exception as e:
            logger.error(
                f"Error cleaning up VM workspace for {project_id}: {str(e)}")
            return False

    # ============= AGENT VM ACCESS =============

    async def get_vm_tools_for_project(self, project_id: str) -> ProjectVMTools:
        """
        🔧 Get MCP tools that give agents FULL computer access

        These tools allow agents to:
        - Execute any shell command with full privileges
        - Install software packages 
        - Manage files and directories
        - Start web servers and services
        - Access databases and APIs
        - Everything a developer can do!
        """
        logger.info(f"[PROJECT_SERVICE] 🔍 Looking for VM tools for project {project_id}")
        logger.info(f"[PROJECT_SERVICE] 📋 Available VM tools: {list(self.active_vm_tools.keys())}")
        logger.info(f"[PROJECT_SERVICE] 📊 Total active VM tools: {len(self.active_vm_tools)}")
        
        vm_tools = self.active_vm_tools.get(project_id)
        if not vm_tools:
            logger.warning(f"[PROJECT_SERVICE] ⚠️ No VM tools found for project {project_id}. Attempting to create them.")
            # Try to create VM tools if they don't exist and the project has an active VM
            project = self.project_repo.get_by_id_only(project_id)
            logger.info(f"[PROJECT_SERVICE] 📋 Project {project_id} details: vm_status={project.vm_status if project else 'None'}, sandbox_id={project.e2b_sandbox_id if project else 'None'}")
            if project and project.vm_status == "active":
                if project.e2b_sandbox_id:
                    logger.info(f"[PROJECT_SERVICE] 🔄 Project {project_id} has active VM status, attempting to reconnect to sandbox {project.e2b_sandbox_id}")
                    try:
                        # First try to reconnect to the existing sandbox
                        reconnected = await self.vm_service.reconnect_to_sandbox(project_id, project.e2b_sandbox_id)
                        if reconnected:
                            logger.info(f"[PROJECT_SERVICE] ✅ Successfully reconnected to sandbox {project.e2b_sandbox_id}")
                            # Now create VM tools
                            self.active_vm_tools[project_id] = ProjectVMTools(
                                self.vm_service,
                                project_id
                            )
                            vm_tools = self.active_vm_tools[project_id]
                            logger.info(f"[PROJECT_SERVICE] ✅ Successfully created VM tools for project {project_id}")
                        else:
                            logger.error(f"[PROJECT_SERVICE] ❌ Failed to reconnect to sandbox {project.e2b_sandbox_id}")
                            logger.info(f"[PROJECT_SERVICE] 🔄 Attempting to create new sandbox for project {project_id}")
                            vm_tools = await self._create_new_sandbox_and_tools(project_id)
                    except Exception as e:
                        logger.error(f"[PROJECT_SERVICE] ❌ Failed to reconnect and create VM tools for project {project_id}: {e}")
                        logger.info(f"[PROJECT_SERVICE] 🔄 Attempting to create new sandbox for project {project_id}")
                        vm_tools = await self._create_new_sandbox_and_tools(project_id)
                else:
                    logger.warning(f"[PROJECT_SERVICE] ⚠️ Project {project_id} has active VM status but no sandbox_id - creating new sandbox")
                    vm_tools = await self._create_new_sandbox_and_tools(project_id)
            else:
                logger.warning(f"[PROJECT_SERVICE] ⚠️ Project {project_id} VM not active (status: {project.vm_status if project else 'not found'}, project exists: {project is not None})")
        
        if not vm_tools:
            logger.error(f"[PROJECT_SERVICE] ❌ No VM tools available for project: {project_id}")
            raise ValueError(f"No VM tools available for project: {project_id}")
        
        logger.info(f"[PROJECT_SERVICE] ✅ VM tools retrieved successfully for project {project_id}")
        return vm_tools

    async def _create_new_sandbox_and_tools(self, project_id: str) -> Optional[ProjectVMTools]:
        """Create a new sandbox and VM tools for a project"""
        try:
            logger.info(f"Creating new E2B sandbox for project {project_id}")
            
            # Create new sandbox
            vm_info = await self.vm_service.create_project_sandbox(
                project_id=project_id,
                environment_type="full"
            )
            
            logger.info(f"New E2B sandbox created: {vm_info}")
            
            # Update project with new VM information
            self.project_repo.update_vm_info_detailed(
                project_id=project_id,
                sandbox_id=vm_info["sandbox_id"],
                vm_status="active",
                vm_config=vm_info
            )
            
            # Create VM tools
            self.active_vm_tools[project_id] = ProjectVMTools(
                self.vm_service,
                project_id
            )
            
            vm_tools = self.active_vm_tools[project_id]
            logger.info(f"Successfully created new sandbox and VM tools for project {project_id}")
            return vm_tools
            
        except Exception as e:
            logger.error(f"Failed to create new sandbox for project {project_id}: {e}")
            return None

    async def execute_agent_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute command in project VM on behalf of an agent"""
        logger.info(f"[PROJECT_SERVICE] 🤖 Agent command execution for project {project_id}: {command}")
        logger.info(f"[PROJECT_SERVICE] 📂 Working directory: {working_dir or 'default'}")
        
        vm_tools = await self.get_vm_tools_for_project(project_id)
        result = await vm_tools.execute_command(command, working_dir)
        
        if result.get('success'):
            logger.info(f"[PROJECT_SERVICE] ✅ Agent command executed successfully")
        else:
            logger.warning(f"[PROJECT_SERVICE] ⚠️ Agent command failed: {result.get('stderr', 'Unknown error')}")
        
        return result

    # ============= FILE MANAGEMENT =============

    async def add_files_to_project(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> List[ProjectFile]:
        """Add files to project and sync to VM"""
        # Add files to database
        project_files = await self.file_repo.add_files(files)

        # Sync to VM if workspace is active
        project = await self.project_repo.get_by_id(project_id, files[0].user_id)
        if project and project.vm_status == "active":
            await self.sync_files_to_vm(project_id)

        return project_files

    async def sync_files_to_vm(self, project_id: str) -> bool:
        """
        📁 Sync all project files to VM workspace

        This ensures agents have access to all project files
        """
        try:
            # For now, assume no files to sync in simulation mode
            project_files = []

            for file in project_files:
                if not file.is_synced:
                    # Download file from storage
                    file_content = await self.storage_provider.download_file(
                        file.storage_path
                    )

                    # Upload to VM
                    vm_path = f"/workspace/{file.file_name}"
                    vm_tools = await self.get_vm_tools_for_project(project_id)
                    await vm_tools.write_file(vm_path, file_content)

                    # Update sync status
                    await self.file_repo.update_file_sync_status(
                        file.id, True, vm_path
                    )

            return True

        except Exception as e:
            logger.error(
                f"Error syncing files to VM for project {project_id}: {str(e)}")
            return False

    # ============= VM SERVICES MANAGEMENT =============

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
        vm_tools = await self.get_vm_tools_for_project(project_id)
        # Start service in VM
        result = await vm_tools.start_service(service_name, command, port)

        # Create service record
        service = ProjectVMService(
            id=result["service_id"],
            project_id=project_id,
            service_name=service_name,
            command=command,
            port=port,
            status="running",
            process_id=result.get("process_id"),
            service_url=result.get("service_url"),
            created_at=datetime.now()
        )

        return await self.vm_service_repo.create_service(service)

    async def stop_vm_service(self, service_id: str) -> bool:
        """Stop a VM service"""
        service = await self.vm_service_repo.get_service_by_id(service_id)
        if not service:
            return False

        vm_tools = await self.get_vm_tools_for_project(service.project_id)
        # Stop service in VM
        success = await vm_tools.stop_service(service_id)

        if success:
            await self.vm_service_repo.update_service_status(
                service_id, "stopped"
            )

        return success

    async def get_project_services(self, project_id: str) -> List[ProjectVMService]:
        """Get all running services for a project"""
        # For simulation mode, return empty list
        return []

    # ============= AGENT INTEGRATION =============

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
        # - self.get_vm_tools_for_project(project_id)
        # - All project files and services
        # - Complete development environment

        # For now, return a placeholder
        return f"conversation_{project_id}_{datetime.now().isoformat()}"

    # ============= HEALTH & MONITORING =============

    async def get_project_status(self, project_id: str) -> Dict[str, Any]:
        """
        📊 Get comprehensive project status

        Returns VM status, running services, file sync status, etc.
        """
        # Get project without user validation for status check
        project = self.project_repo.get_by_id_only(project_id)
        if not project:
            return {"error": "Project not found"}

        # For simulation mode, return empty services and files
        services = []
        files = []

        return {
            "project_id": project_id,
            "vm_status": project.vm_status,
            "vm_url": project.vm_url,
            "sandbox_id": project.e2b_sandbox_id,
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

    def get_project_status_with_project(self, project: Project) -> Dict[str, Any]:
        """Get project status using an already validated project object"""
        # For simulation mode, return empty services and files
        services = []
        files = []

        return {
            "project_id": project.id,
            "vm_status": project.vm_status,
            "vm_url": project.vm_url,
            "sandbox_id": project.e2b_sandbox_id,
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
