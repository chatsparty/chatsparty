from abc import ABC, abstractmethod
from typing import Any, Dict

from ..domain.models import ServiceInfo


class IServiceManager(ABC):
    """Interface for managing services in E2B sandboxes"""

    @abstractmethod
    async def start_service(
        self,
        project_id: str,
        service_config: Dict[str, Any]
    ) -> ServiceInfo:
        """Start a long-running service in the VM"""
        pass

    @abstractmethod
    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        pass