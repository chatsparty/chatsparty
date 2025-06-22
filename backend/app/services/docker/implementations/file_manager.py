import logging
import os
import tarfile
import tempfile
from pathlib import Path
from typing import List, Optional

from ...project.domain.entities import ProjectFile
from ...storage.storage_factory import get_storage_provider
from ..domain.models import DirectoryItem, FileTreeNode
from .container_manager import ContainerManager

logger = logging.getLogger(__name__)


class DockerFileManager:
    """Implementation of file operations for Docker containers"""

    def __init__(self, container_manager: ContainerManager):
        self.container_manager = container_manager
        self.storage_provider = get_storage_provider()

    async def sync_files_to_container(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the container workspace"""
        container = self.container_manager.get_container(project_id)
        if not container:
            logger.error(f"No active container for project {project_id}")
            return False

        try:
            for file in files:
                # Download file from storage
                file_content = await self._download_file_from_storage(
                    file.file_path
                )

                # Determine container path
                container_path = file.vm_path or f"/workspace/{file.filename}"

                # Write file to container using tar stream
                await self._write_file_to_container(
                    container, container_path, file_content
                )

                # Set file permissions if specified
                if file.file_permissions:
                    container.exec_run(
                        f"chmod {file.file_permissions} {container_path}"
                    )

                # Make executable if needed
                if file.is_executable:
                    container.exec_run(f"chmod +x {container_path}")

                logger.info(
                    f"Synced file {file.filename} to container at {container_path}"
                )

            return True

        except Exception as e:
            logger.error(
                f"Failed to sync files to container for project {project_id}: {e}"
            )
            return False

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from container filesystem"""
        container = self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            # Read file using cat command
            result = container.exec_run(f"cat {file_path}")
            if result.exit_code == 0:
                return result.output.decode()
            else:
                raise FileNotFoundError(f"File not found: {file_path}")
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise

    async def write_file(
        self,
        project_id: str,
        file_path: str,
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in container filesystem"""
        container = self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            # Write file to container
            await self._write_file_to_container(container, file_path, content)

            # Set permissions if specified
            if permissions:
                container.exec_run(["sh", "-c", f"chmod {permissions} {file_path}"])

            return True

        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {e}")
            return False

    async def list_directory(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[DirectoryItem]:
        """List directory contents in container"""
        container = self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            result = container.exec_run(["sh", "-c", f"ls -la {path}"])
            if result.exit_code != 0:
                logger.error(f"Failed to list directory {path}")
                return []

            output = result.output.decode()
            files = []

            # Parse ls -la output
            lines = output.strip().split('\n')
            for line in lines[1:]:  # Skip first line (total)
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 9:
                        files.append(DirectoryItem(
                            permissions=parts[0],
                            links=parts[1],
                            owner=parts[2],
                            group=parts[3],
                            size=parts[4],
                            date=" ".join(parts[5:7]),
                            name=" ".join(parts[8:])
                        ))

            return files

        except Exception as e:
            logger.error(f"Failed to list directory {path}: {e}")
            return []

    async def list_files_recursive(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> FileTreeNode:
        """List files recursively in a tree structure"""
        container = self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        return await self._build_file_tree_from_container(
            container, project_id, path
        )

    async def _build_file_tree_from_container(
        self,
        container,
        project_id: str,
        path: str
    ) -> FileTreeNode:
        """Build file tree recursively from container"""

        def build_tree(current_path: str) -> FileTreeNode:
            try:
                # List directory contents
                result = container.exec_run(f"ls -1 {current_path}")
                if result.exit_code != 0:
                    return FileTreeNode(
                        name=os.path.basename(current_path) or project_id,
                        path=current_path,
                        type="directory"
                    )

                output = result.output.decode().strip()
                paths = [line.strip() for line in output.split('\n') if line.strip()]

                # Get the current directory name
                dir_name = (
                    os.path.basename(current_path)
                    if current_path != "/workspace"
                    else project_id
                )

                node = FileTreeNode(
                    name=dir_name,
                    path=current_path,
                    type="directory"
                )

                # Process each item
                for item_name in paths:
                    if not item_name or item_name in ['.', '..']:
                        continue

                    item_path = f"{current_path}/{item_name}"

                    # Check if it's a directory
                    check_result = container.exec_run(f"test -d {item_path}")
                    is_dir = check_result.exit_code == 0

                    if is_dir:
                        # Recursively build subdirectory
                        subdir = build_tree(item_path)
                        node.children.append(subdir)
                    else:
                        # Add file
                        node.children.append(FileTreeNode(
                            name=item_name,
                            path=item_path,
                            type="file"
                        ))

                return node

            except Exception as e:
                logger.error(
                    f"Failed to build file tree for {current_path}: {e}"
                )
                return FileTreeNode(
                    name=os.path.basename(current_path) or project_id,
                    path=current_path,
                    type="directory"
                )

        return build_tree(path)

    async def _write_file_to_container(
        self,
        container,
        file_path: str,
        content: str
    ) -> None:
        """Write file to container using tar stream"""
        try:
            # Create directory if needed
            dir_path = str(Path(file_path).parent)
            container.exec_run(f"mkdir -p {dir_path}")

            # Create a tar archive with the file content
            with tempfile.NamedTemporaryFile() as temp_tar:
                with tarfile.open(temp_tar.name, 'w') as tar:
                    # Create tar info
                    tarinfo = tarfile.TarInfo(name=os.path.basename(file_path))
                    tarinfo.size = len(content.encode())
                    tarinfo.mode = 0o644

                    # Add file to tar
                    tar.addfile(tarinfo, fileobj=tempfile.BytesIO(content.encode()))

                # Read tar content
                temp_tar.seek(0)
                tar_data = temp_tar.read()

            # Extract tar to container
            container.put_archive(path=dir_path, data=tar_data)

        except Exception as e:
            logger.error(f"Failed to write file to container: {e}")
            raise

    async def _download_file_from_storage(self, file_path: str) -> str:
        """Download file content from storage provider"""
        # TODO: Implement actual file download from storage
        # For now, return empty string
        _ = file_path  # Suppress unused parameter warning
        return ""