from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from ..domain.models import ContainerInfo, ContainerSystemInfo


class IContainerManager(ABC):
    """Interface for managing Docker containers"""

    @abstractmethod
    async def create_project_container(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> ContainerInfo:
        """Create a new Docker container for a project"""
        pass

    @abstractmethod
    async def start_container(self, project_id: str) -> bool:
        """Start an existing container"""
        pass

    @abstractmethod
    async def stop_container(self, project_id: str) -> bool:
        """Stop a running container"""
        pass

    @abstractmethod
    def destroy_container(self, project_id: str) -> bool:
        """Destroy a container and clean up resources"""
        pass

    @abstractmethod
    def is_container_active(self, project_id: str) -> bool:
        """Check if container is active for project"""
        pass

    @abstractmethod
    async def get_container_info(
        self,
        project_id: str
    ) -> Optional[ContainerSystemInfo]:
        """Get information about the project's container"""
        pass

    @abstractmethod
    async def cleanup_container(self, project_id: str) -> bool:
        """Clean up and remove container"""
        pass