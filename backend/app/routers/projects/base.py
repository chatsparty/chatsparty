"""
Shared dependencies and utilities for project routers
"""

import logging
from typing import Dict

from fastapi import Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from ...core.database import get_db_session
from ...services.vm_factory import get_vm_service
from ...services.project.application.services import ProjectService
from ...services.project.infrastructure.project_repository import ProjectRepository
from ...services.project.infrastructure.project_file_repository import ProjectFileRepository
from ...services.project.infrastructure.project_vm_service_repository import ProjectVMServiceRepository

logger = logging.getLogger(__name__)

def project_to_dict(project) -> Dict:
    """Convert project entity to dictionary for JSON response"""
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "user_id": project.user_id,
        "vm_container_id": project.vm_container_id,
        "vm_status": project.vm_status,
        "vm_config": project.vm_configuration,
        "vm_url": project.vm_url,
        "storage_mount_path": project.storage_mount_path,
        "storage_config": project.storage_config,
        "is_active": project.is_active,
        "auto_sync_files": project.auto_sync_files,
        "instructions": getattr(project, 'instructions', None),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "last_vm_activity": project.last_vm_activity.isoformat() if project.last_vm_activity else None
    }

_project_service_instance = None

async def get_project_service(db: AsyncSession = Depends(get_db_session)) -> ProjectService:
    """Dependency injection for project service with singleton pattern"""
    global _project_service_instance
    
    if _project_service_instance is None:
        project_repo = ProjectRepository(db)
        file_repo = ProjectFileRepository(db)
        vm_service_repo = ProjectVMServiceRepository(db)
        vm_service = get_vm_service()
        
        _project_service_instance = ProjectService(
            project_repo=project_repo,
            file_repo=file_repo,
            vm_service_repo=vm_service_repo,
            vm_service=vm_service
        )
    
    return _project_service_instance