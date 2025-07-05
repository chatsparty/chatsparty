import uuid
from datetime import datetime
from typing import List, Optional

from sqlmodel import select
from sqlmodel import Session

from ...ai.infrastructure.base_repository import BaseRepository
from ..domain.entities import ProjectVMService
from ..domain.interfaces import ProjectVMServiceRepositoryInterface


class ProjectVMServiceRepository(BaseRepository, ProjectVMServiceRepositoryInterface):
    """Repository implementation for VM service management"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.session = session
        # In-memory storage for now (can be moved to database later)
        self.services = {}

    async def create_service(self, service: ProjectVMService) -> ProjectVMService:
        """Create a new VM service"""
        self.services[service.id] = service
        return service

    async def get_project_services(self, project_id: str) -> List[ProjectVMService]:
        """Get all services for a project"""
        return [
            service for service in self.services.values()
            if service.project_id == project_id
        ]

    async def get_service_by_id(self, service_id: str) -> Optional[ProjectVMService]:
        """Get service by ID"""
        return self.services.get(service_id)

    async def update_service_status(
        self, 
        service_id: str, 
        status: str, 
        process_id: Optional[int] = None, 
        service_url: Optional[str] = None
    ) -> bool:
        """Update service status and runtime info"""
        service = self.services.get(service_id)
        if not service:
            return False

        service.status = status
        if process_id is not None:
            service.process_id = process_id
        if service_url is not None:
            service.service_url = service_url

        service.updated_at = datetime.now()
        if status == "running":
            service.last_started_at = datetime.now()

        return True

    async def delete_service(self, service_id: str) -> bool:
        """Delete a VM service"""
        if service_id in self.services:
            del self.services[service_id]
            return True
        return False