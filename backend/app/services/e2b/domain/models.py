from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class SandboxInfo:
    """Information about an E2B sandbox"""
    sandbox_id: str
    status: str
    workspace_path: str
    environment_type: str
    vm_url: str
    created_at: str


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


@dataclass
class ServiceInfo:
    """Information about a running service"""
    service_name: str
    status: str
    process_id: Optional[int] = None
    service_url: Optional[str] = None
    log_file: Optional[str] = None
    error: Optional[str] = None


@dataclass
class SandboxSystemInfo:
    """System information about a sandbox"""
    sandbox_id: str
    hostname: str
    cpu_cores: str
    memory_info: str
    disk_info: str
    uptime: str
    workspace_path: str


@dataclass
class EnvironmentConfig:
    """Configuration for development environment setup"""
    environment_type: str
    setup_commands: List[str]
    workspace_path: str
