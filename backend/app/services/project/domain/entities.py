from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


@dataclass
class Project:
    """Domain entity for projects"""
    id: str
    name: str
    description: Optional[str]
    user_id: str

    # VM Integration
    vm_container_id: Optional[str] = None
    vm_status: str = "inactive"  # inactive, starting, active, error, stopped
    vm_config: Optional[Dict[str, Any]] = None
    vm_url: Optional[str] = None

    # Storage & Files
    storage_mount_path: Optional[str] = None
    storage_config: Optional[Dict[str, Any]] = None

    # Project settings
    is_active: bool = True
    auto_sync_files: bool = True
    instructions: Optional[str] = None

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_vm_activity: Optional[datetime] = None


@dataclass
class ProjectFile:
    """Domain entity for project files"""
    id: str
    project_id: str
    filename: str
    file_path: str  # Path in storage
    content_type: str
    file_size: int

    # VM integration
    vm_path: Optional[str] = None  # Path in VM
    is_synced_to_vm: bool = False
    last_sync_at: Optional[datetime] = None
    last_modified_in_vm: Optional[datetime] = None

    # File metadata
    checksum: Optional[str] = None
    is_executable: bool = False
    file_permissions: Optional[str] = None  # e.g., "755", "644"

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ProjectVMService:
    """Domain entity for VM services running in project"""
    id: str
    project_id: str
    service_name: str  # e.g., "jupyter", "webapp", "database"
    service_type: str  # e.g., "web", "database", "notebook"
    command: str

    # Service configuration
    port: Optional[int] = None
    working_directory: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None

    # Service status
    status: str = "stopped"  # stopped, starting, running, failed
    process_id: Optional[int] = None
    service_url: Optional[str] = None

    # Service metadata
    auto_start: bool = False
    restart_policy: str = "no"  # no, always, on-failure

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_started_at: Optional[datetime] = None


# Pydantic models for API requests/responses
class ProjectCreate(BaseModel):
    """Project creation request"""
    name: str
    description: Optional[str] = None
    vm_template: Optional[str] = None
    auto_sync_files: bool = True
    auto_setup_vm: Optional[bool] = False


class ProjectUpdate(BaseModel):
    """Project update request"""
    name: Optional[str] = None
    description: Optional[str] = None
    auto_sync_files: Optional[bool] = None


class ProjectFileUpdate(BaseModel):
    """File update request"""
    vm_path: Optional[str] = None
    is_synced: Optional[bool] = None


class VMServiceCreate(BaseModel):
    """VM service creation request"""
    name: str
    command: str
    service_type: Optional[str] = "web"
    port: Optional[int] = None
    working_directory: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None


class VMServiceUpdate(BaseModel):
    """VM service update request"""
    status: Optional[str] = None
    process_id: Optional[int] = None
    service_url: Optional[str] = None


class ProjectFileCreate(BaseModel):
    """Project file creation request"""
    filename: str
    file_path: str
    content_type: str
    file_size: int
    checksum: Optional[str] = None


class VMCommandRequest(BaseModel):
    """VM command execution request"""
    command: str
    working_directory: Optional[str] = None
    timeout: Optional[int] = 30


class VMCommandResult(BaseModel):
    """VM command execution result"""
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float


class VMServiceConfig(BaseModel):
    """VM service configuration"""
    service_name: str
    service_type: str
    command: str
    port: Optional[int] = None
    working_directory: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None
    auto_start: bool = False
    restart_policy: str = "no"
