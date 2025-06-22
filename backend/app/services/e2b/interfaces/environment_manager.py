from abc import ABC, abstractmethod

from ..domain.models import EnvironmentConfig


class IEnvironmentManager(ABC):
    """Interface for managing development environments in E2B sandboxes"""

    @abstractmethod
    async def setup_development_environment(
        self,
        project_id: str,
        environment_type: str,
        workspace_path: str
    ) -> None:
        """Set up development environment in the sandbox"""
        pass

    @abstractmethod
    def get_environment_config(
        self,
        environment_type: str
    ) -> EnvironmentConfig:
        """Get environment configuration for a specific type"""
        pass