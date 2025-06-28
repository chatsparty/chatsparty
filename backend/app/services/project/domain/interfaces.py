from abc import ABC, abstractmethod
from typing import List, Optional

from .entities import (
    Project,
    ProjectCreate,
    ProjectFile,
    ProjectUpdate,
    ProjectVMService,
)


class ProjectRepositoryInterface(ABC):
    """Repository interface for project management"""

    @abstractmethod
    async def create(self, project_data: ProjectCreate, user_id: str) -> Project:
        """Create a new project"""
        pass

    @abstractmethod
    async def get_by_id(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get project by ID for a specific user"""
        pass

    @abstractmethod
    async def get_by_user(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        pass

    @abstractmethod
    async def update(
        self,
        project_id: str,
        project_data: ProjectUpdate,
        user_id: str
    ) -> Optional[Project]:
        """Update project information"""
        pass

    @abstractmethod
    async def delete(self, project_id: str, user_id: str) -> bool:
        """Delete a project"""
        pass

    @abstractmethod
    async def update_vm_info(
        self,
        project_id: str,
        sandbox_id: str,
        vm_status: str,
        vm_config: dict
    ) -> bool:
        """Update VM information for a project"""
        pass

    @abstractmethod
    async def update_vm_status(self, project_id: str, status: str) -> bool:
        """Update VM status"""
        pass


class ProjectFileRepositoryInterface(ABC):
    """Repository interface for project file management"""

    @abstractmethod
    async def add_files(self, files: List[ProjectFile]) -> List[ProjectFile]:
        """Add files to a project"""
        pass

    @abstractmethod
    async def get_project_files(self, project_id: str) -> List[ProjectFile]:
        """Get all files for a project"""
        pass

    @abstractmethod
    async def get_file_by_id(self, file_id: str) -> Optional[ProjectFile]:
        """Get file by ID"""
        pass

    @abstractmethod
    async def update_file_sync_status(
        self,
        file_id: str,
        is_synced: bool,
        vm_path: Optional[str] = None
    ) -> bool:
        """Update file sync status and VM path"""
        pass

    @abstractmethod
    async def update_files_sync_status(self, files: List[ProjectFile]) -> bool:
        """Update sync status for multiple files"""
        pass

    @abstractmethod
    async def delete_file(self, file_id: str) -> bool:
        """Delete a project file"""
        pass


class ProjectVMServiceRepositoryInterface(ABC):
    """Repository interface for VM service management"""

    @abstractmethod
    async def create_service(self, service: ProjectVMService) -> ProjectVMService:
        """Create a new VM service"""
        pass

    @abstractmethod
    async def get_project_services(self, project_id: str) -> List[ProjectVMService]:
        """Get all services for a project"""
        pass

    @abstractmethod
    async def get_service_by_id(self, service_id: str) -> Optional[ProjectVMService]:
        """Get service by ID"""
        pass

    @abstractmethod
    async def update_service_status(self, service_id: str, status: str, process_id: Optional[int] = None, service_url: Optional[str] = None) -> bool:
        """Update service status and runtime info"""
        pass

    @abstractmethod
    async def delete_service(self, service_id: str) -> bool:
        """Delete a VM service"""
        pass
