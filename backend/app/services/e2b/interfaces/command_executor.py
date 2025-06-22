from abc import ABC, abstractmethod
from typing import Optional

from ...project.domain.entities import VMCommandResult


class ICommandExecutor(ABC):
    """Interface for executing commands in E2B sandboxes"""

    @abstractmethod
    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in project VM with full system access"""
        pass

    @abstractmethod
    async def install_package(
        self,
        project_id: str,
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the VM"""
        pass