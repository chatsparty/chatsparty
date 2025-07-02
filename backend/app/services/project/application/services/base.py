"""
Base service with shared functionality for project services
"""

import logging
from typing import Dict

from ....vm_factory import get_vm_service
# MCP integration removed - ProjectVMTools functionality disabled
class ProjectVMTools:
    def __init__(self, *args, **kwargs):
        pass
from ....storage.storage_factory import get_storage_provider
from ...domain.interfaces import (
    ProjectFileRepositoryInterface,
    ProjectRepositoryInterface,
    ProjectVMServiceRepositoryInterface,
)

logger = logging.getLogger(__name__)


class BaseProjectService:
    """Base class for project services with shared dependencies"""

    def __init__(
        self,
        project_repo: ProjectRepositoryInterface,
        file_repo: ProjectFileRepositoryInterface,
        vm_service_repo: ProjectVMServiceRepositoryInterface,
        vm_service=None
    ):
        self.project_repo = project_repo
        self.file_repo = file_repo
        self.vm_service_repo = vm_service_repo
        self.vm_service = vm_service or get_vm_service()
        self.storage_provider = get_storage_provider()

        self.active_vm_tools: Dict[str, ProjectVMTools] = {}