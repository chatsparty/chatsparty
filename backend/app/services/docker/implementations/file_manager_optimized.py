import logging
import os
import asyncio
import json
import mimetypes
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import aiofiles
import aiofiles.os

from ...project.domain.entities import ProjectFile
from ...storage.storage_factory import get_storage_provider
from ..domain.models import DirectoryItem, FileTreeNode
from .container_manager import ContainerManager

logger = logging.getLogger(__name__)


class OptimizedDockerFileManager:
    """Optimized file manager using os.scandir() for efficient operations"""

    def __init__(self, container_manager: ContainerManager):
        self.container_manager = container_manager
        self.storage_provider = get_storage_provider()
        
    def _get_file_type(self, path: str, is_dir: bool) -> str:
        """Determine file type based on extension"""
        if is_dir:
            return "directory"
        
        ext = Path(path).suffix.lower()
        
        type_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.csv': 'csv',
            '.sql': 'sql',
            
            '.md': 'markdown',
            '.txt': 'text',
            '.pdf': 'pdf',
            '.doc': 'document',
            '.docx': 'document',
            
            '.jpg': 'image',
            '.jpeg': 'image',
            '.png': 'image',
            '.gif': 'image',
            '.svg': 'svg',
            '.ico': 'image',
            
            '.zip': 'archive',
            '.tar': 'archive',
            '.gz': 'archive',
            '.rar': 'archive',
            '.env': 'env',
            '.gitignore': 'git',
            '.dockerignore': 'docker',
        }
        
        return type_map.get(ext, 'file')

    def _format_size(self, size: int) -> str:
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f}{unit}"
            size /= 1024.0
        return f"{size:.1f}PB"

    def _entry_to_dict(self, entry: os.DirEntry, base_path: str = "") -> Dict[str, Any]:
        """Convert os.DirEntry to dictionary with metadata"""
        try:
            stat = entry.stat(follow_symlinks=False)
            full_path = os.path.join(base_path, entry.name)
            
            result = {
                "id": full_path,
                "name": entry.name,
                "path": full_path,
                "type": self._get_file_type(entry.name, entry.is_dir()),
                "is_directory": entry.is_dir(),
                "is_file": entry.is_file(),
                "is_symlink": entry.is_symlink(),
            }
            
            if not entry.is_dir():
                result.update({
                    "size": stat.st_size,
                    "size_formatted": self._format_size(stat.st_size),
                })
            
            result.update({
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "accessed": datetime.fromtimestamp(stat.st_atime).isoformat(),
            })
            
            result["permissions"] = oct(stat.st_mode)[-3:]
            
            if entry.is_dir():
                try:
                    has_children = any(os.scandir(full_path))
                    if not has_children:
                        result["children"] = []
                except PermissionError:
                    pass
                    
            return result
            
        except Exception as e:
            logger.warning(f"Error processing entry {entry.name}: {e}")
            return {
                "id": os.path.join(base_path, entry.name),
                "name": entry.name,
                "path": os.path.join(base_path, entry.name),
                "type": "unknown",
                "error": str(e)
            }

    def list_directory_sync(self, path: str, include_hidden: bool = False) -> List[Dict[str, Any]]:
        """Synchronous high-performance directory listing using os.scandir()"""
        try:
            entries = []
            with os.scandir(path) as scanner:
                for entry in scanner:
                    if not include_hidden and entry.name.startswith('.'):
                        continue
                        
                    entry_dict = self._entry_to_dict(entry, path)
                    entries.append(entry_dict)
                    
            entries.sort(key=lambda x: (not x.get('is_directory', False), x['name'].lower()))
            
            logger.info(f"Listed {len(entries)} items in {path}")
            return entries
            
        except PermissionError:
            logger.error(f"Permission denied accessing {path}")
            return []
        except FileNotFoundError:
            logger.error(f"Directory not found: {path}")
            return []
        except Exception as e:
            logger.error(f"Error listing directory {path}: {e}")
            return []

    async def list_directory_children(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """Async wrapper for listing immediate children of a directory"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            python_script = f"""
import os
import json
import stat
from datetime import datetime

def get_file_info(path, name):
    full_path = os.path.join(path, name)
    try:
        file_stat = os.stat(full_path)
        is_dir = stat.S_ISDIR(file_stat.st_mode)
        
        info = {{
            "id": full_path,
            "name": name,
            "path": full_path,
            "type": "directory" if is_dir else "file",
            "is_directory": is_dir,
            "is_file": not is_dir,
            "size": file_stat.st_size if not is_dir else None,
            "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
            "permissions": oct(file_stat.st_mode)[-3:]
        }}
        
        if is_dir:
            # For lazy loading: don't set children property for directories
            # The frontend will fetch children when the directory is expanded
            # Only set children to empty array if we know the directory is empty
            try:
                has_children = bool(os.listdir(full_path))
                if not has_children:
                    info["children"] = []
                # If has_children, don't set the children property at all
            except:
                # On error, don't set children property
                pass
                
        return info
    except Exception as e:
        return {{
            "id": full_path,
            "name": name,
            "path": full_path,
            "type": "unknown",
            "error": str(e)
        }}

try:
    entries = []
    for name in os.listdir('{path}'):
        if not name.startswith('.'):  # Skip hidden files
            entries.append(get_file_info('{path}', name))
    
    # Sort directories first, then by name
    entries.sort(key=lambda x: (not x.get('is_directory', False), x['name'].lower()))
    print(json.dumps(entries))
except Exception as e:
    print(json.dumps({{"error": str(e)}}))
"""
            
            result = await self.container_manager._exec_command(
                container,
                ["python3", "-c", python_script]
            )
            
            if result.exit_code == 0:
                try:
                    output = result.output.decode('utf-8').strip()
                    data = json.loads(output)
                    
                    if isinstance(data, dict) and "error" in data:
                        logger.error(f"Error in container script: {data['error']}")
                        return []
                        
                    return data
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON output: {e}")
                    logger.error(f"Raw output: {result.output}")
                    return []
            else:
                logger.error(f"Command failed with exit code {result.exit_code}")
                logger.error(f"Error output: {result.output}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to list directory children: {e}")
            return []

    async def create_file(self, project_id: str, file_path: str, content: str = "") -> bool:
        """Create a new file with content"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            parent_dir = os.path.dirname(file_path)
            mkdir_cmd = ["mkdir", "-p", parent_dir]
            await self.container_manager._exec_command(container, mkdir_cmd)
            
            if content:
                python_cmd = f"""
import os
content = '''{content}'''
with open('{file_path}', 'w') as f:
    f.write(content)
"""
                result = await self.container_manager._exec_command(
                    container, 
                    ["python3", "-c", python_cmd]
                )
            else:
                result = await self.container_manager._exec_command(
                    container, 
                    ["touch", file_path]
                )
            
            return result.exit_code == 0
            
        except Exception as e:
            logger.error(f"Failed to create file {file_path}: {e}")
            return False

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            result = await self.container_manager._exec_command(
                container,
                ["cat", file_path]
            )
            
            if result.exit_code == 0:
                return result.output.decode('utf-8', errors='replace')
            else:
                raise FileNotFoundError(f"File not found: {file_path}")
                
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise

    async def write_file(self, project_id: str, file_path: str, content: str) -> bool:
        """Write content to an existing file"""
        return await self.create_file(project_id, file_path, content)

    async def delete_file(self, project_id: str, file_path: str) -> bool:
        """Delete a file"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            result = await self.container_manager._exec_command(
                container,
                ["rm", "-f", file_path]
            )
            return result.exit_code == 0
            
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            return False

    async def delete_directory(self, project_id: str, dir_path: str, recursive: bool = False) -> bool:
        """Delete a directory"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            cmd = ["rm", "-rf" if recursive else "-d", dir_path]
            result = await self.container_manager._exec_command(container, cmd)
            return result.exit_code == 0
            
        except Exception as e:
            logger.error(f"Failed to delete directory {dir_path}: {e}")
            return False

    async def create_directory(self, project_id: str, dir_path: str) -> bool:
        """Create a new directory"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            result = await self.container_manager._exec_command(
                container,
                ["mkdir", "-p", dir_path]
            )
            return result.exit_code == 0
            
        except Exception as e:
            logger.error(f"Failed to create directory {dir_path}: {e}")
            return False

    async def move_file(self, project_id: str, source_path: str, target_path: str) -> bool:
        """Move/rename a file or directory"""
        container = await self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")
        
        try:
            parent_dir = os.path.dirname(target_path)
            await self.container_manager._exec_command(
                container,
                ["mkdir", "-p", parent_dir]
            )
            
            result = await self.container_manager._exec_command(
                container,
                ["mv", source_path, target_path]
            )
            return result.exit_code == 0
            
        except Exception as e:
            logger.error(f"Failed to move {source_path} to {target_path}: {e}")
            return False