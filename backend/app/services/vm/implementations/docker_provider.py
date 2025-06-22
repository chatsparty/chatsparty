import logging
from typing import Dict, List, Optional, Any

from ...docker.docker_facade import DockerFacade
from ...project.domain.entities import ProjectFile, VMCommandResult
from ..interfaces.vm_provider import VMProviderInterface

logger = logging.getLogger(__name__)


class DockerProvider(VMProviderInterface):
    """Docker implementation of VM provider interface"""
    
    def __init__(self):
        self.docker_facade = DockerFacade()
        logger.info("[DOCKER_PROVIDER] Docker provider initialized")

    async def create_project_sandbox(
        self, 
        project_id: str, 
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new Docker container for a project"""
        logger.info(f"[DOCKER_PROVIDER] Creating sandbox for project {project_id}")
        return await self.docker_facade.create_project_sandbox(
            project_id, template_id, environment_type
        )

    async def reconnect_to_sandbox(
        self, 
        project_id: str, 
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing Docker container"""
        logger.info(f"[DOCKER_PROVIDER] Reconnecting to sandbox {sandbox_id} for project {project_id}")
        return await self.docker_facade.reconnect_to_sandbox(project_id, sandbox_id)

    async def get_or_reconnect_sandbox(
        self, 
        project_id: str, 
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing container or attempt to reconnect"""
        return await self.docker_facade.get_or_reconnect_sandbox(project_id, sandbox_id)

    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy Docker container and clean up resources"""
        logger.info(f"[DOCKER_PROVIDER] Destroying sandbox for project {project_id}")
        return await self.docker_facade.destroy_sandbox(project_id)

    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if Docker container is active for project"""
        return self.docker_facade.is_sandbox_active(project_id)

    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's Docker container"""
        return await self.docker_facade.get_sandbox_info(project_id)

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate Docker container"""
        return await self.docker_facade.cleanup_sandbox(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the Docker container for a project"""
        return await self.docker_facade.destroy_project_sandbox(project_id)

    # File Management Methods
    async def sync_files_to_vm(
        self, 
        project_id: str, 
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the Docker container workspace"""
        return await self.docker_facade.sync_files_to_vm(project_id, files)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from Docker container filesystem"""
        return await self.docker_facade.read_file(project_id, file_path)

    async def write_file(
        self, 
        project_id: str, 
        file_path: str, 
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in Docker container filesystem"""
        return await self.docker_facade.write_file(project_id, file_path, content, permissions)

    async def list_directory(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in Docker container"""
        return await self.docker_facade.list_directory(project_id, path)

    async def list_files_recursive(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        return await self.docker_facade.list_files_recursive(project_id, path)

    # Command Execution Methods
    async def execute_command(
        self, 
        project_id: str, 
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in Docker container"""
        return await self.docker_facade.execute_command(project_id, command, working_dir, timeout)

    async def install_package(
        self, 
        project_id: str, 
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the Docker container"""
        return await self.docker_facade.install_package(project_id, package, package_manager)

    # Service Management Methods
    async def start_service(
        self, 
        project_id: str, 
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the Docker container"""
        return await self.docker_facade.start_service(project_id, service_config)

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        return await self.docker_facade.stop_service(project_id, process_id)