import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ....models.database import ProjectFile as ProjectFileModel
from ...ai.infrastructure.base_repository import BaseRepository
from ..domain.entities import ProjectFile, ProjectFileCreate, ProjectFileUpdate
from ..domain.interfaces import ProjectFileRepositoryInterface


class ProjectFileRepository(BaseRepository, ProjectFileRepositoryInterface):
    """Repository implementation for project file management"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.session = session

    async def add_files(self, files: List[ProjectFile]) -> List[ProjectFile]:
        """Add files to a project"""
        db_files = []
        for file in files:
            db_file = ProjectFileModel(
                id=file.id,
                project_id=file.project_id,
                filename=file.filename,
                file_size=file.file_size,
                content_type=file.content_type,
                file_path=file.file_path,
                vm_path=file.vm_path,
                is_synced_to_vm=file.is_synced_to_vm
            )
            self.session.add(db_file)
            db_files.append(db_file)
        
        self.session.commit()
        
        return [self._to_entity(db_file) for db_file in db_files]

    async def get_project_files(self, project_id: str) -> List[ProjectFile]:
        """Get all files for a project"""
        stmt = select(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id
        ).order_by(ProjectFileModel.created_at.desc())

        result = self.session.execute(stmt)
        db_files = result.scalars().all()

        return [self._to_entity(file) for file in db_files]

    async def get_file_by_id(self, file_id: str) -> Optional[ProjectFile]:
        """Get file by ID"""
        stmt = select(ProjectFileModel).where(
            ProjectFileModel.id == file_id
        )
        result = self.session.execute(stmt)
        db_file = result.scalar_one_or_none()

        return self._to_entity(db_file) if db_file else None

    async def update_file_sync_status(
        self,
        file_id: str,
        is_synced: bool,
        vm_path: Optional[str] = None
    ) -> bool:
        """Update file sync status and VM path"""
        stmt = select(ProjectFileModel).where(
            ProjectFileModel.id == file_id
        )
        result = self.session.execute(stmt)
        db_file = result.scalar_one_or_none()

        if not db_file:
            return False

        db_file.is_synced_to_vm = is_synced
        if vm_path is not None:
            db_file.vm_path = vm_path
        db_file.updated_at = datetime.now()

        self.session.commit()
        return True

    async def update_files_sync_status(self, files: List[ProjectFile]) -> bool:
        """Update sync status for multiple files"""
        for file in files:
            stmt = select(ProjectFileModel).where(
                ProjectFileModel.id == file.id
            )
            result = self.session.execute(stmt)
            db_file = result.scalar_one_or_none()
            
            if db_file:
                db_file.is_synced_to_vm = file.is_synced_to_vm
                db_file.vm_path = file.vm_path
                db_file.updated_at = datetime.now()
        
        self.session.commit()
        return True

    async def delete_file(self, file_id: str) -> bool:
        """Delete a project file"""
        stmt = select(ProjectFileModel).where(
            ProjectFileModel.id == file_id
        )
        result = self.session.execute(stmt)
        db_file = result.scalar_one_or_none()

        if not db_file:
            return False

        self.session.delete(db_file)
        self.session.commit()
        return True

    def _to_entity(self, db_file: ProjectFileModel) -> ProjectFile:
        """Convert database model to domain entity"""
        return ProjectFile(
            id=db_file.id,
            project_id=db_file.project_id,
            filename=db_file.filename,
            file_path=db_file.file_path,
            content_type=db_file.content_type,
            file_size=db_file.file_size,
            vm_path=db_file.vm_path,
            is_synced_to_vm=db_file.is_synced_to_vm,
            created_at=db_file.created_at,
            updated_at=db_file.updated_at
        )