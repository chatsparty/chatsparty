import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ....models.database import Project as ProjectModel
from ...ai.infrastructure.base_repository import BaseRepository
from ..domain.entities import Project, ProjectCreate, ProjectUpdate
from ..domain.interfaces import ProjectRepositoryInterface


class ProjectRepository(BaseRepository, ProjectRepositoryInterface):
    """Repository implementation for project management"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.session = session

    def create(self, project_data: ProjectCreate, user_id: str) -> Project:
        """Create a new project"""
        project_id = str(uuid.uuid4())

        db_project = ProjectModel(
            id=project_id,
            name=project_data.name,
            description=project_data.description,
            user_id=user_id,
            auto_sync_files=project_data.auto_sync_files,
            is_active=True,
            vm_status='inactive'
        )

        self.session.add(db_project)
        self.session.commit()
        self.session.refresh(db_project)

        return self._to_entity(db_project)

    def get_by_id(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get project by ID for a specific user"""
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.user_id == user_id
        )
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        return self._to_entity(db_project) if db_project else None

    def get_by_id_only(self, project_id: str) -> Optional[Project]:
        """Get project by ID without user validation - for internal use only"""
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        return self._to_entity(db_project) if db_project else None

    def get_by_user(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        stmt = select(ProjectModel).where(
            ProjectModel.user_id == user_id
        ).order_by(ProjectModel.created_at.desc())

        result = self.session.execute(stmt)
        db_projects = result.scalars().all()

        return [self._to_entity(project) for project in db_projects]

    def update(self, project_id: str, project_data: ProjectUpdate, user_id: str) -> Optional[Project]:
        """Update project"""
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.user_id == user_id
        )
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            return None

        # Update fields
        if project_data.name is not None:
            db_project.name = project_data.name
        if project_data.description is not None:
            db_project.description = project_data.description
        if project_data.auto_sync_files is not None:
            db_project.auto_sync_files = project_data.auto_sync_files

        db_project.updated_at = datetime.now()

        self.session.commit()
        self.session.refresh(db_project)

        return self._to_entity(db_project)

    def delete(self, project_id: str, user_id: str) -> bool:
        """Delete project"""
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.user_id == user_id
        )
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            return False

        self.session.delete(db_project)
        self.session.commit()

        return True

    def update_vm_info(self, project_id: str, vm_info: dict) -> bool:
        """Update VM information for a project"""
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            return False

        # Update VM fields
        db_project.e2b_sandbox_id = vm_info.get('sandbox_id')
        db_project.e2b_template_id = vm_info.get('template_id')
        db_project.vm_url = vm_info.get('vm_url')
        db_project.vm_config = vm_info.get('vm_config', {})
        db_project.last_vm_activity = datetime.now()
        db_project.updated_at = datetime.now()

        self.session.commit()

        return True

    def update_vm_status(self, project_id: str, status: str) -> bool:
        """Update VM status"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[REPO] 📝 Updating VM status for project {project_id} to: {status}")
        
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            logger.error(f"[REPO] ❌ Project {project_id} not found in database")
            return False

        old_status = db_project.vm_status
        db_project.vm_status = status
        db_project.last_vm_activity = datetime.now()
        db_project.updated_at = datetime.now()

        try:
            self.session.commit()
            logger.info(f"[REPO] ✅ VM status updated successfully: {old_status} -> {status}")
            return True
        except Exception as e:
            logger.error(f"[REPO] ❌ Failed to commit VM status update: {e}")
            self.session.rollback()
            return False

    def update_vm_info_detailed(
        self,
        project_id: str,
        sandbox_id: str,
        vm_status: str,
        vm_config: dict
    ) -> bool:
        """Update VM information for a project (detailed version)"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[REPO] 📝 Updating detailed VM info for project {project_id}")
        logger.info(f"[REPO] Sandbox ID: {sandbox_id}, Status: {vm_status}")
        
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id
        )
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            logger.error(f"[REPO] ❌ Project {project_id} not found for detailed VM update")
            return False

        old_sandbox_id = db_project.e2b_sandbox_id
        old_status = db_project.vm_status
        
        db_project.e2b_sandbox_id = sandbox_id
        db_project.vm_status = vm_status
        db_project.vm_config = vm_config
        db_project.last_vm_activity = datetime.now()
        db_project.updated_at = datetime.now()

        try:
            self.session.commit()
            logger.info(f"[REPO] ✅ Detailed VM info updated successfully")
            logger.info(f"[REPO] Sandbox: {old_sandbox_id} -> {sandbox_id}")
            logger.info(f"[REPO] Status: {old_status} -> {vm_status}")
            return True
        except Exception as e:
            logger.error(f"[REPO] ❌ Failed to commit detailed VM info update: {e}")
            self.session.rollback()
            return False

    def update_vm_status_secondary(self, project_id: str, status: str) -> bool:
        """Update VM status (secondary method)"""
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id
        )
        result = self.session.execute(stmt)
        db_project = result.scalar_one_or_none()

        if not db_project:
            return False

        db_project.vm_status = status
        db_project.last_vm_activity = datetime.now()
        db_project.updated_at = datetime.now()

        self.session.commit()
        return True

    def _to_entity(self, db_project: ProjectModel) -> Project:
        """Convert database model to domain entity"""
        return Project(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            user_id=db_project.user_id,
            e2b_sandbox_id=db_project.e2b_sandbox_id,
            e2b_template_id=db_project.e2b_template_id,
            vm_status=db_project.vm_status,
            vm_config=db_project.vm_config,
            vm_url=db_project.vm_url,
            storage_mount_path=db_project.storage_mount_path,
            storage_config=db_project.storage_config,
            is_active=db_project.is_active,
            auto_sync_files=db_project.auto_sync_files,
            created_at=db_project.created_at,
            updated_at=db_project.updated_at,
            last_vm_activity=db_project.last_vm_activity
        )
