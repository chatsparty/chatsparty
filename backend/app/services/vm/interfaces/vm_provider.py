from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
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
    async def kill_process_by_port(self, project_id: str, port: int) -> bool:
        """Kill process listening on specific port"""
        pass
    
    @abstractmethod
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports in the VM/container"""
        pass


    @abstractmethod
    async def get_container_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get container information"""
        pass

    # ============= IDE MANAGEMENT =============
    
    @abstractmethod
    async def setup_ide_server(
        self, 
        project_id: str, 
        ide_type: str = "vscode",
        port: int = 8080
    ) -> Dict[str, Any]:
        """Setup and start an IDE server (VS Code, Theia, etc.) in the VM/container"""
        pass

    @abstractmethod
    async def get_ide_status(self, project_id: str) -> Dict[str, Any]:
        """Get IDE server status and connection information"""
        pass

    @abstractmethod
    async def stop_ide_server(self, project_id: str) -> bool:
        """Stop the IDE server"""
        pass

    @abstractmethod
    async def is_ide_running(self, project_id: str) -> bool:
        """Check if IDE server is currently running"""
        pass