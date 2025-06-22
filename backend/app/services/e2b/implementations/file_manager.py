import logging
import os
from pathlib import Path
from typing import List, Optional

from ...project.domain.entities import ProjectFile
from ...storage.storage_factory import get_storage_provider
from ..domain.models import DirectoryItem, FileTreeNode
from ..interfaces.file_manager import IFileManager
from .sandbox_manager import SandboxManager

logger = logging.getLogger(__name__)


class FileManager(IFileManager):
    """Implementation of file operations for E2B sandboxes"""

    def __init__(self, sandbox_manager: SandboxManager):
        self.sandbox_manager = sandbox_manager
        self.storage_provider = get_storage_provider()

    async def sync_files_to_vm(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the VM workspace"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            logger.error(f"No active sandbox for project {project_id}")
            return False

        workspace_path = f"/workspace/{project_id}"

        try:
            for file in files:
                # Download file from storage
                file_content = await self._download_file_from_storage(
                    file.file_path
                )

                # Determine VM path
                vm_path = file.vm_path or f"{workspace_path}/{file.filename}"

                # Create directory if needed
                vm_dir = str(Path(vm_path).parent)
                sandbox.run_code(
                    f"import os; os.makedirs('{vm_dir}', exist_ok=True)"
                )

                # Write file to VM using E2B files API
                if isinstance(file_content, str):
                    sandbox.files.write(vm_path, file_content)
                else:
                    # Handle binary files - convert to string for now
                    sandbox.files.write(vm_path, str(file_content))

                # Set file permissions if specified
                if file.file_permissions:
                    sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '{file.file_permissions}', '{vm_path}'], check=True)
""")

                # Make executable if needed
                if file.is_executable:
                    sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '+x', '{vm_path}'], check=True)
""")

                logger.info(f"Synced file {file.filename} to VM at {vm_path}")

            return True

        except Exception as e:
            logger.error(
                f"Failed to sync files to VM for project {project_id}: {e}"
            )
            return False

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from VM filesystem"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            raise ValueError(f"No active sandbox for project {project_id}")

        try:
            # Use E2B files API to read file
            content = sandbox.files.read(file_path)
            return content
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
        """Write content to file in VM filesystem"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            raise ValueError(f"No active sandbox for project {project_id}")

        try:
            # Create directory if needed
            file_dir = str(Path(file_path).parent)
            sandbox.run_code(
                f"import os; os.makedirs('{file_dir}', exist_ok=True)"
            )

            # Write file content using E2B files API
            sandbox.files.write(file_path, content)

            # Set permissions if specified
            if permissions:
                sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '{permissions}', '{file_path}'], check=True)
""")

            return True

        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {e}")
            return False

    async def list_directory(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[DirectoryItem]:
        """List directory contents in VM"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            raise ValueError(f"No active sandbox for project {project_id}")

        try:
            # Use subprocess to list directory
            result = sandbox.run_code(f"""
import subprocess
import os

try:
    result = subprocess.run(['ls', '-la', '{path}'], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        print("OUTPUT_START")
        print(result.stdout)
        print("OUTPUT_END")
    else:
        print("ERROR: Directory listing failed")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
""")

            # Extract output from result - handle None case
            if result is None:
                logger.debug(f"Directory listing returned None for path {path}")
                ls_output = ""
            else:
                output = ""
                if hasattr(result, 'text') and result.text:
                    output = result.text
                else:
                    output = str(result) if result else ""

                # Extract the actual ls output
                ls_output = ""
                capturing = False
                for line in output.split('\n'):
                    if line.strip() == "OUTPUT_START":
                        capturing = True
                        continue
                    elif line.strip() == "OUTPUT_END":
                        break
                    elif capturing:
                        ls_output += line + '\n'

            files = []
            # Skip first line (total)
            lines = ls_output.strip().split('\n')
            for line in lines[1:] if len(lines) > 1 else []:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 9:
                        files.append(DirectoryItem(
                            permissions=parts[0],
                            links=parts[1],
                            owner=parts[2],
                            group=parts[3],
                            size=parts[4],
                            date=" ".join(parts[5:8]),
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
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            logger.warning(
                f"No active sandbox for project {project_id}, "
                f"attempting to reconnect..."
            )
            # Try to get project info and reconnect if possible
            # For now, we'll raise the error since we need project info to reconnect
            raise ValueError(f"No active sandbox for project {project_id}")

        return await self._build_file_tree_from_sandbox(
            sandbox, project_id, path
        )

    async def _build_file_tree_from_sandbox(
        self,
        sandbox,
        project_id: str,
        path: str
    ) -> FileTreeNode:
        """Build file tree recursively from real sandbox"""

        async def build_tree(current_path: str) -> FileTreeNode:
            try:
                # List directory contents using ls -1 for simple listing
                result = sandbox.run_code(f"""
import subprocess
import os

try:
    result = subprocess.run(['ls', '-1', '{current_path}'], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        print("OUTPUT_START")
        print(result.stdout)
        print("OUTPUT_END")
    else:
        print("OUTPUT_START")
        print("")
        print("OUTPUT_END")
except Exception as e:
    print("OUTPUT_START")
    print("")
    print("OUTPUT_END")
""")

                # Extract output from result - handle None case
                if result is None:
                    logger.debug(f"run_code returned None for path {current_path}")
                    ls_output = ""
                else:
                    output = ""
                    if hasattr(result, 'text') and result.text:
                        output = result.text
                    else:
                        output = str(result) if result else ""

                    # Extract the actual ls output
                    ls_output = ""
                    capturing = False
                    for line in output.split('\n'):
                        if line.strip() == "OUTPUT_START":
                            capturing = True
                            continue
                        elif line.strip() == "OUTPUT_END":
                            break
                        elif capturing:
                            ls_output += line + '\n'

                if not ls_output.strip():
                    # Directory might not exist or be empty
                    logger.debug(
                        f"Directory {current_path} is empty or doesn't exist"
                    )
                    paths = []
                else:
                    paths = [
                        line.strip()
                        for line in ls_output.strip().split('\n')
                        if line.strip()
                    ]

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
                    check_result = sandbox.run_code(f"""
import os
if os.path.isdir('{item_path}'):
    print('dir')
else:
    print('file')
""")

                    # Extract check result - handle None case
                    if check_result is None:
                        logger.debug(
                            f"Directory check returned None for {item_path}"
                        )
                        is_dir = False
                    else:
                        check_output = ""
                        if hasattr(check_result, 'text') and check_result.text:
                            check_output = check_result.text
                        else:
                            check_output = str(check_result) if check_result else ""
                        is_dir = check_output.strip() == 'dir'

                    if is_dir:
                        # Recursively build subdirectory
                        subdir = await build_tree(item_path)
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
                # Return empty directory structure on error
                return FileTreeNode(
                    name=(
                        os.path.basename(current_path)
                        if current_path != "/workspace"
                        else project_id
                    ),
                    path=current_path,
                    type="directory"
                )

        return await build_tree(path)

    async def _download_file_from_storage(self, file_path: str) -> bytes:
        """Download file content from storage provider"""
        # This would depend on your storage provider implementation
        # For now, return empty bytes - implement based on your storage system
        # TODO: Implement actual file download from storage
        _ = file_path  # Suppress unused parameter warning
        return b""