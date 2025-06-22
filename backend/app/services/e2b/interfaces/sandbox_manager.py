from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from ..domain.models import SandboxInfo, SandboxSystemInfo


class ISandboxManager(ABC):
    """Interface for managing E2B sandboxes"""

    @abstractmethod
    async def create_project_sandbox(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> SandboxInfo:
        """Create a new E2B sandbox for a project"""
        pass

    @abstractmethod
    async def reconnect_to_sandbox(
        self,
        project_id: str,
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing E2B sandbox"""
        pass

    @abstractmethod
    async def get_or_reconnect_sandbox(
        self,
        project_id: str,
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing sandbox or attempt to reconnect"""
        pass

    @abstractmethod
    def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy a sandbox and clean up resources"""
        pass

    @abstractmethod
    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if sandbox is active for project"""
        pass

    @abstractmethod
    async def get_sandbox_info(
        self,
        project_id: str
    ) -> Optional[SandboxSystemInfo]:
        """Get information about the project's sandbox"""
        pass

    @abstractmethod
    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate sandbox"""
        pass