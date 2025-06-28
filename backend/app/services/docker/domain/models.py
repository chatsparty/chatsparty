from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class ContainerInfo:
    """Information about a Docker container"""
    container_id: str
    status: str
    workspace_path: str
    environment_type: str
    ports: Dict[str, int]
    created_at: str


@dataclass
class ContainerSystemInfo:
    """System information about a Docker container"""
    container_id: str
    hostname: str
    cpu_cores: str
    memory_info: str
    disk_info: str
    uptime: str
    workspace_path: str


@dataclass
class ContainerServiceInfo:
    """Information about a running service in container"""
    service_name: str
    status: str
    process_id: Optional[int] = None
    service_url: Optional[str] = None
    log_file: Optional[str] = None
    error: Optional[str] = None


@dataclass
class FileTreeNode:
    """Represents a node in the file tree"""
    name: str
    path: str
    type: str  # "file" or "directory"
    children: List['FileTreeNode'] = field(default_factory=list)


@dataclass
class DirectoryItem:
    """Represents a directory listing item"""
    permissions: str
    links: str
    owner: str
    group: str
    size: str
    date: str
    name: str