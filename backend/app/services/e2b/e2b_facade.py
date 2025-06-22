import logging
from typing import Any, Dict, List, Optional

from ..project.domain.entities import ProjectFile, VMCommandResult
from .domain.models import DirectoryItem, FileTreeNode, ServiceInfo, SandboxInfo, SandboxSystemInfo
from .implementations.command_executor import CommandExecutor
from .implementations.environment_manager import EnvironmentManager
from .implementations.file_manager import FileManager
from .implementations.sandbox_manager import SandboxManager
from .implementations.service_manager import ServiceManager

logger = logging.getLogger(__name__)


class E2BFacade:
    """
    Facade for E2B service operations, providing a clean interface
    for interacting with E2B sandboxes while hiding implementation complexity
    """

    def __init__(self):
        # Initialize core managers
        self.sandbox_manager = SandboxManager()
        self.file_manager = FileManager(self.sandbox_manager)
        self.command_executor = CommandExecutor(self.sandbox_manager)
        self.service_manager = ServiceManager(self.sandbox_manager)
        self.environment_manager = EnvironmentManager(self.sandbox_manager)

    # Sandbox Management Methods
    async def create_project_sandbox(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> Dict[str, Any]:
        """Create a new E2B sandbox for a project"""
        sandbox_info = await self.sandbox_manager.create_project_sandbox(
            project_id, template_id, environment_type
        )
        return {
            "sandbox_id": sandbox_info.sandbox_id,
            "status": sandbox_info.status,
            "workspace_path": sandbox_info.workspace_path,
            "environment_type": sandbox_info.environment_type,
            "vm_url": sandbox_info.vm_url,
            "created_at": sandbox_info.created_at
        }

    async def reconnect_to_sandbox(
        self,
        project_id: str,
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing E2B sandbox"""
        return await self.sandbox_manager.reconnect_to_sandbox(
            project_id, sandbox_id
        )

    async def get_or_reconnect_sandbox(
        self,
        project_id: str,
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing sandbox or attempt to reconnect"""
        return await self.sandbox_manager.get_or_reconnect_sandbox(
            project_id, sandbox_id
        )

    def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy a sandbox and clean up resources"""
        return self.sandbox_manager.destroy_sandbox(project_id)

    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if sandbox is active for project"""
        return self.sandbox_manager.is_sandbox_active(project_id)

    async def get_sandbox_info(
        self,
        project_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get information about the project's sandbox"""
        info = await self.sandbox_manager.get_sandbox_info(project_id)
        if not info:
            return None
        
        return {
            "sandbox_id": info.sandbox_id,
            "hostname": info.hostname,
            "cpu_cores": info.cpu_cores,
            "memory_info": info.memory_info,
            "disk_info": info.disk_info,
            "uptime": info.uptime,
            "workspace_path": info.workspace_path
        }

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate sandbox"""
        return await self.sandbox_manager.cleanup_sandbox(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the sandbox for a project"""
        return await self.cleanup_sandbox(project_id)

    # File Management Methods
    async def sync_files_to_vm(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the VM workspace"""
        return await self.file_manager.sync_files_to_vm(project_id, files)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from VM filesystem"""
        return await self.file_manager.read_file(project_id, file_path)

    async def write_file(
        self,
        project_id: str,
        file_path: str,
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in VM filesystem"""
        return await self.file_manager.write_file(
            project_id, file_path, content, permissions
        )

    async def list_directory(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in VM"""
        items = await self.file_manager.list_directory(project_id, path)
        return [
            {
                "permissions": item.permissions,
                "links": item.links,
                "owner": item.owner,
                "group": item.group,
                "size": item.size,
                "date": item.date,
                "name": item.name
            }
            for item in items
        ]

    async def list_files_recursive(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        tree = await self.file_manager.list_files_recursive(project_id, path)
        return self._convert_tree_to_dict(tree)

    def _convert_tree_to_dict(self, node: FileTreeNode) -> Dict[str, Any]:
        """Convert FileTreeNode to dictionary"""
        result = {
            "name": node.name,
            "path": node.path,
            "type": node.type
        }
        if node.children:
            result["children"] = [
                self._convert_tree_to_dict(child) for child in node.children
            ]
        return result

    # Command Execution Methods
    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in project VM with full system access"""
        return await self.command_executor.execute_command(
            project_id, command, working_dir, timeout
        )

    async def install_package(
        self,
        project_id: str,
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the VM"""
        return await self.command_executor.install_package(
            project_id, package, package_manager
        )

    # Service Management Methods
    async def start_service(
        self,
        project_id: str,
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the VM"""
        service_info = await self.service_manager.start_service(
            project_id, service_config
        )
        return {
            "service_name": service_info.service_name,
            "status": service_info.status,
            "process_id": service_info.process_id,
            "service_url": service_info.service_url,
            "log_file": service_info.log_file,
            "error": service_info.error
        }

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        return await self.service_manager.stop_service(project_id, process_id)

    # Environment Management Methods
    async def setup_development_environment(
        self,
        project_id: str,
        environment_type: str,
        workspace_path: str
    ) -> None:
        """Set up development environment in the sandbox"""
        await self.environment_manager.setup_development_environment(
            project_id, environment_type, workspace_path
        )