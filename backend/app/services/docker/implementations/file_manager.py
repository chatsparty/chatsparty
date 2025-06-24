import logging
import os
import tarfile
import tempfile
import io
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any

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
        
    async def _exec_command(self, container, cmd, **kwargs):
        """Helper method to execute commands in aiodocker container"""
        try:
            logger.info(f"[AIODOCKER] Executing command: {cmd}")
            exec_obj = await container.exec(cmd, **kwargs)
            stream = exec_obj.start(detach=False)
            
            output_chunks = []
            async with stream:
                while True:
                    try:
                        msg = await asyncio.wait_for(stream.read_out(), timeout=5.0)
                        if msg is None:
                            break
                        if hasattr(msg, 'data'):
                            output_chunks.append(msg.data)
                        else:
                            output_chunks.append(msg)
                    except asyncio.TimeoutError:
                        logger.warning(f"Timeout reading stream for command: {cmd}")
                        break
            
            output_bytes = b"".join(output_chunks)
            logger.info(f"[AIODOCKER] Read {len(output_bytes)} bytes from command output")
            
            inspect_result = await exec_obj.inspect()
            exit_code = inspect_result.get("ExitCode", 0)
            logger.info(f"[AIODOCKER] Command exit code: {exit_code}")
            
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(output_bytes, exit_code)
        except Exception as e:
            logger.error(f"Error executing command {cmd}: {e}")
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(b"", 1)

    async def sync_files_to_container(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the container workspace"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            logger.error(f"No active container for project {project_id}")
            return False

        try:
            for file in files:
                file_content = await self._download_file_from_storage(
                    file.file_path
                )

                container_path = file.vm_path or f"/workspace/{file.filename}"

                await self._write_file_to_container(
                    container, container_path, file_content
                )

                if file.file_permissions:
                    await self._exec_command(
                        container, ["chmod", file.file_permissions, container_path]
                    )

                if file.is_executable:
                    await self._exec_command(container, ["chmod", "+x", container_path])

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
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            result = await self._exec_command(container, ["cat", file_path])
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
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            await self._write_file_to_container(container, file_path, content)

            if permissions:
                await self._exec_command(container, ["chmod", permissions, file_path])

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
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        try:
            result = await self._exec_command(container, ["ls", "-la", path])
            if result.exit_code != 0:
                logger.error(f"Failed to list directory {path}")
                return []

            output = result.output.decode()
            files = []

            lines = output.strip().split('\n')
            for line in lines[1:]:
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
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        return await self._build_file_tree_from_container(
            container, project_id, path
        )
    
    async def list_directory_children(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List only immediate children of a directory (non-recursive)"""
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            ls_cmd = ["ls", "-la", "--group-directories-first", path]
            result = await self._exec_command(container, ls_cmd)
            
            if result.exit_code != 0:
                logger.warning(f"ls command failed for {path}")
                return []
            
            output = result.output.decode().strip()
            children = []
            
            lines = output.split('\n')[1:]
            for line in lines:
                if not line.strip():
                    continue
                    
                parts = line.split(None, 8)
                if len(parts) < 9:
                    continue
                
                name = parts[8]
                if name in ['.', '..']:
                    continue
                
                is_dir = parts[0].startswith('d')
                file_path = os.path.join(path, name)
                
                child = {
                    "id": file_path,
                    "name": name,
                    "path": file_path,
                    "type": "directory" if is_dir else "file",
                    "size": parts[4] if not is_dir else None,
                    "modified": " ".join(parts[5:8])
                }
                
                if is_dir:
                    check_cmd = ["sh", "-c", f"ls -A '{file_path}' 2>/dev/null | head -1"]
                    check_result = await self._exec_command(container, check_cmd)
                    has_children = check_result.exit_code == 0 and check_result.output.strip() != b""
                    child["children"] = [] if has_children else None
                
                children.append(child)
            
            logger.info(f"Found {len(children)} children in {path}")
            return children
            
        except Exception as e:
            logger.error(f"Failed to list directory children: {e}")
            return []

    async def _build_file_tree_from_container(
        self,
        container,
        project_id: str,
        path: str
    ) -> FileTreeNode:
        """Build file tree recursively from container using an efficient approach"""
        try:
            find_cmd = [
                "sh", "-c",
                f"""find {path} \\( \
                -name node_modules -o \
                -name .git -o \
                -name venv -o \
                -name .venv -o \
                -name __pycache__ -o \
                -name dist -o \
                -name build -o \
                -name .next -o \
                -name .cache -o \
                -name coverage \
                \\) -prune -o \\( -type f -o -type d \\) -print | head -2000 | sort"""
            ]
            
            logger.info(f"Building file tree for path: {path}")
            result = await self._exec_command(container, find_cmd)
            
            if result.exit_code != 0:
                logger.warning(f"Find command failed, falling back to simple tree")
                return FileTreeNode(
                    name=os.path.basename(path) or "workspace",
                    path=path,
                    type="directory"
                )
            
            output = result.output.decode().strip()
            all_paths = [line.strip() for line in output.split('\n') if line.strip()]
            
            logger.info(f"Found {len(all_paths)} paths from find command")
            if len(all_paths) < 20:
                logger.info(f"All paths: {all_paths}")
            else:
                logger.info(f"First 10 paths: {all_paths[:10]}")
            
            root_name = os.path.basename(path) if path != "/workspace" else "workspace"
            root = FileTreeNode(name=root_name, path=path, type="directory")
            
            nodes_map = {path: root}
            
            all_paths.sort()
            
            for file_path in all_paths:
                if file_path == path:
                    continue
                
                parent_path = os.path.dirname(file_path)
                file_name = os.path.basename(file_path)
                
                if parent_path not in nodes_map:
                    continue
                
                parent_node = nodes_map[parent_path]
                
                is_directory = any(p.startswith(file_path + "/") for p in all_paths)
                
                node = FileTreeNode(
                    name=file_name,
                    path=file_path,
                    type="directory" if is_directory else "file"
                )
                
                parent_node.children.append(node)
                
                if is_directory:
                    nodes_map[file_path] = node
            
            logger.info(f"Successfully built file tree with {len(all_paths)} items")
            return root
            
        except Exception as e:
            logger.error(f"Failed to build file tree for {path}: {e}")
            return FileTreeNode(
                name=os.path.basename(path) or "workspace",
                path=path,
                type="directory"
            )

    async def _write_file_to_container(
        self,
        container,
        file_path: str,
        content: str
    ) -> None:
        """Write file to container using tar stream"""
        try:
            dir_path = str(Path(file_path).parent)
            await self._exec_command(container, ["mkdir", "-p", dir_path])

            with tempfile.NamedTemporaryFile() as temp_tar:
                with tarfile.open(temp_tar.name, 'w') as tar:
                    tarinfo = tarfile.TarInfo(name=os.path.basename(file_path))
                    tarinfo.size = len(content.encode())
                    tarinfo.mode = 0o644

                    tar.addfile(tarinfo, fileobj=io.BytesIO(content.encode()))

                temp_tar.seek(0)
                tar_data = temp_tar.read()

            await container.put_archive(path=dir_path, data=tar_data)

        except Exception as e:
            logger.error(f"Failed to write file to container: {e}")
            raise

    async def _download_file_from_storage(self, file_path: str) -> str:
        """Download file content from storage provider"""
        _ = file_path
        return ""