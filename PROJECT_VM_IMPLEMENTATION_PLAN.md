# Project-Based Agent VM Implementation Plan

## Overview
This document outlines the implementation plan for integrating project-based virtualization with the existing multi-agent AI system. The goal is to enable multiple agents to collaborate within shared, isolated virtual machine environments on a per-project basis, using platform-appropriate virtualization technologies.

## Multi-Platform Architecture Strategy
- **Production (Cloud)**: Fly.io with native Firecracker microVMs
- **Linux Development**: Native Firecracker for authentic testing
- **macOS Development**: Lima VMs or Docker containers  
- **Windows Development**: WSL2 with Firecracker or Docker fallback

## Architecture Goals
- **Shared Workspaces**: Multiple agents can work within the same project VM
- **Isolation**: Each project runs in its own secure Firecracker microVM
- **Persistence**: Project state and files persist across agent interactions
- **Scalability**: VMs created on-demand, destroyed when no longer needed
- **Cost Efficiency**: One VM per project, not per agent

## Phase 1: Core Infrastructure (Weeks 1-2)

### 1.1 Domain Model Extensions
**Location**: `backend/app/services/projects/domain/`

#### 1.1.1 Project Entity
```python
# File: backend/app/services/projects/domain/entities.py
@dataclass
class Project:
    project_id: str
    name: str
    description: str
    project_type: ProjectType  # DEVELOPMENT, ANALYSIS, DEPLOYMENT
    vm_id: Optional[str]
    vm_status: VMStatus  # CREATING, RUNNING, STOPPED, FAILED
    vm_url: Optional[str]
    workspace_path: str
    owner_id: str
    agents: List[str]  # Agent IDs with access
    created_at: datetime
    updated_at: datetime
    settings: ProjectSettings

@dataclass
class ProjectSettings:
    auto_sleep_minutes: int = 30
    max_storage_gb: int = 10
    allowed_tools: List[str] = field(default_factory=list)
    environment_variables: Dict[str, str] = field(default_factory=dict)
```

#### 1.1.2 VM Status Tracking
```python
# File: backend/app/services/projects/domain/entities.py
class VMStatus(Enum):
    CREATING = "creating"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"
    DESTROYING = "destroying"

class ProjectType(Enum):
    DEVELOPMENT = "development"
    ANALYSIS = "analysis"
    DEPLOYMENT = "deployment"
    SANDBOX = "sandbox"
```

### 1.2 Database Schema
**Location**: `backend/app/models/`

#### 1.2.1 Project Tables
```sql
-- Add to database migrations
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL,
    vm_id VARCHAR(255),
    vm_status VARCHAR(50) DEFAULT 'creating',
    vm_url TEXT,
    workspace_path VARCHAR(500),
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE project_agents (
    project_id UUID,
    agent_id UUID,
    access_level VARCHAR(50) DEFAULT 'read_write',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, agent_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE project_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    command TEXT NOT NULL,
    output TEXT,
    error_output TEXT,
    exit_code INTEGER,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
```

### 1.3 Multi-Platform VM Service
**Location**: `backend/app/services/projects/infrastructure/`

#### 1.3.1 Unified VM Service Interface
```python
# File: backend/app/services/projects/infrastructure/vm_service.py
from typing import Protocol
import platform

class VMServiceProtocol(Protocol):
    async def create_project_vm(self, project: Project) -> VMCreationResult: ...
    async def destroy_project_vm(self, vm_id: str) -> bool: ...
    async def start_project_vm(self, vm_id: str) -> bool: ...
    async def stop_project_vm(self, vm_id: str) -> bool: ...
    async def get_vm_status(self, vm_id: str) -> VMStatus: ...
    async def get_vm_url(self, vm_id: str) -> str: ...

class UnifiedVMService:
    def __init__(self, environment: str = None):
        self.vm_service = self._get_platform_service(environment)
    
    def _get_platform_service(self, environment: str = None) -> VMServiceProtocol:
        if environment == "production":
            return FlyVMService()
        elif environment == "firecracker":
            return FirecrackerVMService()
        elif platform.system() == "Darwin":  # macOS
            return LimaVMService() if self._has_lima() else DockerVMService()
        elif platform.system() == "Linux":
            return FirecrackerVMService() if self._has_firecracker() else DockerVMService()
        else:  # Windows
            return DockerVMService()
```

#### 1.3.2 Fly.io Service (Production)
```python
# File: backend/app/services/projects/infrastructure/fly_vm_service.py
class FlyVMService(VMServiceProtocol):
    def __init__(self, fly_token: str = None, app_name: str = None):
        self.fly_token = fly_token or os.getenv("FLY_API_TOKEN")
        self.app_name = app_name or os.getenv("FLY_APP_NAME")
        self.base_url = "https://api.machines.dev/v1"
```

#### 1.3.3 Firecracker Service (Linux)
```python
# File: backend/app/services/projects/infrastructure/firecracker_vm_service.py
class FirecrackerVMService(VMServiceProtocol):
    def __init__(self):
        self.vm_instances = {}
        self.base_socket_path = "/tmp/firecracker"
    
    async def create_project_vm(self, project: Project) -> VMCreationResult:
        """Create native Firecracker microVM"""
```

#### 1.3.4 Lima Service (macOS)
```python
# File: backend/app/services/projects/infrastructure/lima_vm_service.py
class LimaVMService(VMServiceProtocol):
    def __init__(self):
        self.vm_instances = {}
    
    async def create_project_vm(self, project: Project) -> VMCreationResult:
        """Create Lima VM for macOS development"""
```

#### 1.3.5 Docker Service (Fallback)
```python
# File: backend/app/services/projects/infrastructure/docker_vm_service.py
class DockerVMService(VMServiceProtocol):
    def __init__(self):
        self.docker_client = docker.from_env()
    
    async def create_project_vm(self, project: Project) -> VMCreationResult:
        """Create Docker container as VM alternative"""
```

#### 1.3.6 Project VM Runtime Image
**Location**: `docker/project-vm-runtime/`

```dockerfile
# File: docker/project-vm-runtime/Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (for frontend projects)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Install Python dependencies for runtime
COPY requirements.txt /app/
RUN pip install -r /app/requirements.txt

# Copy runtime service
COPY project_vm_runtime.py /app/
COPY entrypoint.sh /app/

EXPOSE 8080
CMD ["/app/entrypoint.sh"]
```

```python
# File: docker/project-vm-runtime/project_vm_runtime.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os
import json
from pathlib import Path

app = FastAPI(title="Project VM Runtime")

class ExecutionRequest(BaseModel):
    agent_id: str
    command: str
    working_directory: str = "/workspace"
    environment: Dict[str, str] = {}
    timeout: int = 300

class FileOperationRequest(BaseModel):
    operation: str  # create, read, update, delete, list
    path: str
    content: Optional[str] = None

@app.post("/execute")
async def execute_command(request: ExecutionRequest):
    """Execute command from agent"""
    
@app.post("/files")
async def file_operation(request: FileOperationRequest):
    """Handle file operations"""
    
@app.get("/health")
async def health_check():
    return {"status": "healthy", "workspace": "/workspace"}
```

## Phase 2: Project Management Services (Weeks 3-4)

### 2.1 Project Service Layer
**Location**: `backend/app/services/projects/application/`

#### 2.1.1 Project Service
```python
# File: backend/app/services/projects/application/project_service.py
class ProjectService:
    def __init__(self, 
                 project_repo: ProjectRepositoryInterface,
                 vm_service: UnifiedVMService,
                 agent_service: AgentService):
        self.project_repo = project_repo
        self.vm_service = vm_service
        self.agent_service = agent_service
    
    async def create_project(self, project_data: CreateProjectRequest) -> Project:
        """Create new project with VM"""
        
    async def assign_agent_to_project(self, project_id: str, agent_id: str) -> bool:
        """Add agent access to project"""
        
    async def remove_agent_from_project(self, project_id: str, agent_id: str) -> bool:
        """Remove agent access from project"""
        
    async def execute_agent_task(self, 
                                project_id: str, 
                                agent_id: str, 
                                task: AgentTask) -> ExecutionResult:
        """Execute agent task in project VM"""
        
    async def get_project_files(self, project_id: str) -> List[FileInfo]:
        """List files in project workspace"""
        
    async def start_project(self, project_id: str) -> bool:
        """Start project VM if stopped"""
        
    async def stop_project(self, project_id: str) -> bool:
        """Stop project VM to save costs"""
        
    async def delete_project(self, project_id: str) -> bool:
        """Delete project and VM"""
```

### 2.2 Repository Layer
**Location**: `backend/app/services/projects/infrastructure/`

#### 2.2.1 Database Repositories
```python
# File: backend/app/services/projects/infrastructure/repositories.py
class DatabaseProjectRepository(ProjectRepositoryInterface):
    def __init__(self, session: Session):
        self.session = session
    
    async def create_project(self, project: Project) -> Project:
        """Create project in database"""
        
    async def get_project(self, project_id: str) -> Optional[Project]:
        """Get project by ID"""
        
    async def list_user_projects(self, user_id: str) -> List[Project]:
        """List projects owned by user"""
        
    async def update_project(self, project: Project) -> Project:
        """Update project details"""
        
    async def delete_project(self, project_id: str) -> bool:
        """Delete project from database"""
        
    async def get_project_executions(self, project_id: str) -> List[ExecutionRecord]:
        """Get execution history for project"""
```

## Phase 3: API Integration (Week 5)

### 3.1 REST API Endpoints
**Location**: `backend/app/routers/`

#### 3.1.1 Project Router
```python
# File: backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException
from ..services.projects.application.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
async def create_project(project_data: CreateProjectRequest):
    """Create new project with VM"""

@router.get("/", response_model=List[ProjectResponse])
async def list_projects():
    """List user's projects"""

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get project details"""

@router.post("/{project_id}/agents/{agent_id}")
async def assign_agent(project_id: str, agent_id: str):
    """Assign agent to project"""

@router.delete("/{project_id}/agents/{agent_id}")
async def remove_agent(project_id: str, agent_id: str):
    """Remove agent from project"""

@router.post("/{project_id}/execute")
async def execute_task(project_id: str, task: AgentTaskRequest):
    """Execute agent task in project"""

@router.get("/{project_id}/files")
async def list_files(project_id: str):
    """List project files"""

@router.post("/{project_id}/start")
async def start_project(project_id: str):
    """Start project VM"""

@router.post("/{project_id}/stop")
async def stop_project(project_id: str):
    """Stop project VM"""

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete project and VM"""
```

### 3.2 WebSocket for Real-time Updates
```python
# File: backend/app/routers/project_websocket.py
@router.websocket("/projects/{project_id}/ws")
async def project_websocket(websocket: WebSocket, project_id: str):
    """WebSocket for real-time project updates"""
    # Handle real-time execution output
    # VM status changes
    # File system changes
```

## Phase 4: Frontend Integration (Week 6)

### 4.1 Project Management UI
**Location**: `frontend/src/components/projects/`

#### 4.1.1 Project Components
```typescript
// File: frontend/src/components/projects/ProjectManager.tsx
interface Project {
  id: string;
  name: string;
  type: 'development' | 'analysis' | 'deployment';
  status: 'creating' | 'running' | 'stopped';
  agents: string[];
  createdAt: string;
}

export const ProjectManager: React.FC = () => {
  // Project CRUD operations
  // VM status monitoring
  // Agent assignment
}

// File: frontend/src/components/projects/ProjectWorkspace.tsx
export const ProjectWorkspace: React.FC<{projectId: string}> = ({projectId}) => {
  // File browser
  // Execution history
  // Real-time output
  // Agent collaboration view
}
```

### 4.2 API Integration
```typescript
// File: frontend/src/services/projectService.ts
export class ProjectService {
  async createProject(projectData: CreateProjectRequest): Promise<Project> {}
  async listProjects(): Promise<Project[]> {}
  async assignAgent(projectId: string, agentId: string): Promise<void> {}
  async executeTask(projectId: string, task: AgentTask): Promise<ExecutionResult> {}
  async getProjectFiles(projectId: string): Promise<FileInfo[]> {}
  async startProject(projectId: string): Promise<void> {}
  async stopProject(projectId: string): Promise<void> {}
}
```

## Phase 5: Advanced Features (Weeks 7-8)

### 5.1 Auto-scaling and Cost Optimization
- **Auto-sleep**: Stop VMs after inactivity
- **Auto-wake**: Start VMs on agent task request
- **Resource monitoring**: Track CPU/memory usage
- **Cost tracking**: Monitor Fly.io costs per project

### 5.2 Security Enhancements
- **Network isolation**: Restrict VM network access
- **File system quotas**: Limit storage per project
- **Tool restrictions**: Whitelist allowed commands
- **Audit logging**: Track all agent executions

### 5.3 Collaboration Features
- **Real-time file sharing**: Multiple agents editing files
- **Execution queuing**: Manage concurrent agent tasks
- **Conflict resolution**: Handle file conflicts
- **Project templates**: Pre-configured project types

## Platform-Specific Setup Instructions

### Linux Development Setup
```bash
# Install Firecracker
curl -L https://github.com/firecracker-microvm/firecracker/releases/latest/download/firecracker-v1.4.1-x86_64.tgz | tar -xz
sudo mv firecracker-v1.4.1-x86_64 /usr/local/bin/firecracker

# Set permissions
sudo setfacl -m u:${USER}:rw /dev/kvm

# Configure environment
export VM_SERVICE=firecracker
export FIRECRACKER_KERNEL_PATH=/opt/firecracker/vmlinux
export FIRECRACKER_ROOTFS_PATH=/opt/firecracker/rootfs.ext4
```

### macOS Development Setup
```bash
# Install Lima
brew install lima

# Create development VM
limactl start --name wisty-dev ubuntu-lts

# Configure environment
export VM_SERVICE=lima
export LIMA_INSTANCE=wisty-dev
```

### Windows Development Setup
```bash
# Enable WSL2 with nested virtualization
Set-VMProcessor -VMName <WSL2-VM-Name> -ExposeVirtualizationExtensions $true

# Inside WSL2 - follow Linux setup
# OR use Docker fallback
export VM_SERVICE=docker
```

### Production Deployment
```bash
# Fly.io setup
fly auth signup
fly apps create wisty-agents

# Configure environment
export VM_SERVICE=production
export FLY_API_TOKEN=your_token
export FLY_APP_NAME=wisty-agents
```

## Implementation Timeline

| Week | Phase | Key Deliverables |
|------|--------|------------------|
| 1-2  | Core Infrastructure | Domain models, database schema, multi-platform VM integration |
| 3-4  | Project Services | Business logic, repositories, unified VM management |
| 5    | API Integration | REST endpoints, WebSocket connections |
| 6    | Frontend | Project UI, agent assignment, file browser |
| 7-8  | Advanced Features | Auto-scaling, security, collaboration |

## Risk Mitigation

### Technical Risks
- **Platform compatibility**: Implement graceful fallbacks for each platform
- **VM networking**: Test internal communication across all VM types
- **Data persistence**: Implement backup strategies for project data
- **Performance variance**: Different VM types have different performance characteristics
- **Cost management**: Set up billing alerts and auto-shutdown policies (cloud)

### Operational Risks
- **VM creation failures**: Implement error handling and retry mechanisms
- **Resource exhaustion**: Monitor and limit resource usage
- **Security vulnerabilities**: Regular security audits and updates
- **Data loss**: Regular backups and disaster recovery plans

## Success Metrics

### Performance Metrics
- VM creation time < 30 seconds
- Agent task execution latency < 2 seconds
- File operations response time < 1 second
- System uptime > 99.9%

### Business Metrics
- Cost per project < $5/month average
- User adoption rate > 80%
- Agent collaboration efficiency +300%
- Project completion time reduction 50%

## Dependencies

### External Services
- **Cloud**: Fly.io API access and billing setup (production only)
- **Container Registry**: Docker registry for VM images
- **Local Tools**: Firecracker, Lima, Docker (platform-dependent)
- **Monitoring**: Logging infrastructure for all platforms

### Internal Dependencies
- Existing agent service integration
- Database migration scripts
- Frontend build pipeline updates
- CI/CD pipeline modifications

## Platform Comparison Matrix

| Feature | Firecracker (Linux) | Lima (macOS) | Docker (Fallback) | Fly.io (Production) |
|---------|---------------------|---------------|-------------------|---------------------|
| **Isolation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Startup Time** | 125ms | 2-5s | 1-3s | 125ms |
| **Memory Overhead** | <5MB | ~50MB | ~20MB | <5MB |
| **Security** | Hardware VM | VM Isolation | Process Isolation | Hardware VM |
| **Setup Complexity** | High | Medium | Low | Medium |
| **Development** | Excellent | Good | Good | Production Only |

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating project-based virtualization with the existing multi-agent system. The multi-platform approach ensures:

- **Universal Compatibility**: Developers can work on any platform with appropriate VM technology
- **Production Parity**: Firecracker used in both Linux development and production
- **Graceful Fallbacks**: Docker containers provide reliable alternative when VMs aren't available
- **Consistent API**: Unified service interface abstracts platform differences

The architecture enables true agent collaboration within isolated, persistent environments while adapting to each platform's capabilities and constraints. This flexibility ensures the system can be developed and deployed across diverse environments while maintaining security and performance goals.