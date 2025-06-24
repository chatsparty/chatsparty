from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime

from ...project.domain.entities import ProjectFile, VMCommandResult


@dataclass
class VMInstance:
    """Represents a VM/Container instance across providers"""
    id: str
    status: str
    ip_address: Optional[str] = None
    ports: Optional[Dict[str, int]] = None
    workspace_path: str = "/workspace"
    environment_type: str = "minimal"
    vm_url: Optional[str] = None
    created_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CommandResult:
    """Represents the result of a command execution"""
    exit_code: int
    stdout: str
    stderr: str


class VMProviderInterface(ABC):
    """Abstract interface for VM/Container providers"""

    @abstractmethod
    async def create_project_sandbox(
        self, 
        project_id: str, 
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new VM/container instance for a project"""
        pass

    @abstractmethod
    async def reconnect_to_sandbox(
        self, 
        project_id: str, 
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing VM/container"""
        pass

    @abstractmethod
    async def get_or_reconnect_sandbox(
        self, 
        project_id: str, 
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing container or attempt to reconnect"""
        pass

    @abstractmethod
    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy VM/container and clean up resources"""
        pass

    @abstractmethod
    async def is_sandbox_active(self, project_id: str) -> bool:
        """Check if VM/container is active for project"""
        pass

    @abstractmethod
    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's VM/container"""
        pass

    @abstractmethod
    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate VM/container"""
        pass

    @abstractmethod
    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the VM/container for a project"""
        pass

    @abstractmethod
    async def sync_files_to_vm(
        self, 
        project_id: str, 
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the VM/container workspace"""
        pass

    @abstractmethod
    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from VM/container filesystem"""
        pass

    @abstractmethod
    async def write_file(
        self, 
        project_id: str, 
        file_path: str, 
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in VM/container filesystem"""
        pass

    @abstractmethod
    async def list_directory(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in VM/container"""
        pass

    @abstractmethod
    async def list_files_recursive(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        pass
    
    @abstractmethod
    async def list_directory_children(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List only immediate children of a directory"""
        pass

    @abstractmethod
    async def execute_command(
        self, 
        project_id: str, 
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in VM/container"""
        pass

    @abstractmethod
    async def install_package(
        self, 
        project_id: str, 
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the VM/container"""
        pass

    @abstractmethod
    async def start_service(
        self, 
        project_id: str, 
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the VM/container"""
        pass

    @abstractmethod
    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        pass
    
    @abstractmethod
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports in the VM/container"""
        pass

    @abstractmethod
    async def setup_file_watcher(self, project_id: str, callback: Callable[[str, str, str], None]) -> None:
        """
        Setup file system watcher for project
        callback(event_type, file_path, project_id)
        event_type: 'created', 'modified', 'deleted', 'folder_created'
        """
        pass

    @abstractmethod
    async def stop_file_watcher(self, project_id: str) -> None:
        """Stop file system watcher for project"""
        pass

    @abstractmethod
    async def create_file(self, project_id: str, file_path: str, content: str = "") -> bool:
        """Create a new file with specified content"""
        pass

    @abstractmethod
    async def create_directory(self, project_id: str, dir_path: str) -> bool:
        """Create a new directory"""
        pass

    @abstractmethod
    async def delete_file(self, project_id: str, file_path: str) -> bool:
        """Delete a file"""
        pass

    @abstractmethod
    async def delete_directory(self, project_id: str, dir_path: str, recursive: bool = False) -> bool:
        """Delete a directory (optionally recursive)"""
        pass

    @abstractmethod
    async def move_file(self, project_id: str, source_path: str, destination_path: str) -> bool:
        """Move/rename a file or directory"""
        pass

    @abstractmethod
    async def resize_terminal(self, project_id: str, exec_id: str, rows: int, cols: int) -> None:
        """Resize terminal session"""
        pass
        
    @abstractmethod
    async def get_container_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get container information for terminal access"""
        pass