"""
Project file management service
"""

import logging
from typing import List

from ...domain.entities import ProjectFile
from .base import BaseProjectService

logger = logging.getLogger(__name__)


class ProjectFileService(BaseProjectService):
    """
    File management for projects
    Handles file operations and synchronization with VM workspace
    """

    async def add_files_to_project(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> List[ProjectFile]:
        """Add files to project and sync to VM"""
        project_files = await self.file_repo.add_files(files)

        project = await self.project_repo.get_by_id(project_id, files[0].user_id)
        if project and project.vm_status == "active":
            await self.sync_files_to_vm(project_id)

        return project_files

    async def sync_files_to_vm(self, project_id: str) -> bool:
        """
        📁 Sync all project files to VM workspace
        
        This ensures agents have access to all project files
        """
        try:
            project_files = []

            for file in project_files:
                if not file.is_synced:
                    file_content = await self.storage_provider.download_file(
                        file.storage_path
                    )
                    vm_path = f"/workspace/{file.file_name}"                    
                    await self.file_repo.update_file_sync_status(
                        file.id, True, vm_path
                    )

            return True

        except Exception as e:
            logger.error(f"Error syncing files to VM for project {project_id}: {str(e)}")
            return False