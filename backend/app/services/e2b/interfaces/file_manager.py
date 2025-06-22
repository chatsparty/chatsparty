from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from ...project.domain.entities import ProjectFile
from ..domain.models import DirectoryItem, FileTreeNode


class IFileManager(ABC):
    """Interface for file operations in E2B sandboxes"""

    @abstractmethod
    async def sync_files_to_vm(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the VM workspace"""
        pass

    @abstractmethod
    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from VM filesystem"""
        pass

    @abstractmethod
    async def write_file(
        self,
        project_id: str,
        file_path: str,
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in VM filesystem"""
        pass

    @abstractmethod
    async def list_directory(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[DirectoryItem]:
        """List directory contents in VM"""
        pass

    @abstractmethod
    async def list_files_recursive(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> FileTreeNode:
        """List files recursively in a tree structure"""
        pass