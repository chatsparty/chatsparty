import os
from typing import Dict, Any


class ContainerConfig:
    """Handle container configuration and setup"""
    
    def __init__(self, base_image: str):
        self.base_image = base_image
        self.workspace_path = "/tmp/chatsparty/workspace"
    
    def get_container_config(self, project_id: str) -> Dict[str, Any]:
        """Get the container configuration for creation"""
        return {
            "Image": self.base_image,
            "Cmd": ["code-server", "--bind-addr=0.0.0.0:8080", "--auth=none", "/workspace"],
            "WorkingDir": "/workspace",
            "Env": [
                f"PROJECT_ID={project_id}",
                "DEBIAN_FRONTEND=noninteractive",
                "HOME=/workspace"
            ],
            "User": "codespace",
            "HostConfig": {
                "Memory": 2147483648,  # 2GB
                "CpuQuota": 100000,
                "Binds": [f"{self.workspace_path}:/workspace:rw"],
                "PortBindings": {
                    "8080/tcp": [{"HostPort": ""}],  # VS Code Server
                    "3000/tcp": [{"HostPort": ""}],  # Common dev port
                },
                "SecurityOpt": ["seccomp:unconfined"]
            },
            "ExposedPorts": {
                "8080/tcp": {},  # VS Code Server
                "3000/tcp": {},  # Common dev port
            }
        }
    
    def get_container_config_with_port(self, project_id: str, new_port: int, current_port_bindings: Dict) -> Dict[str, Any]:
        """Get container configuration for recreation with additional port"""
        # Add new port binding
        current_port_bindings[f"{new_port}/tcp"] = [{"HostPort": ""}]
        
        return {
            "Image": self.base_image,
            "Cmd": ["code-server", "--bind-addr=0.0.0.0:8080", "--auth=none", "/workspace"],
            "WorkingDir": "/workspace",
            "Env": [
                f"PROJECT_ID={project_id}",
                "DEBIAN_FRONTEND=noninteractive",
                "HOME=/workspace"
            ],
            "User": "codespace",
            "HostConfig": {
                "Memory": 2147483648,
                "CpuQuota": 100000,
                "Binds": [f"{self.workspace_path}:/workspace:rw"],
                "PortBindings": current_port_bindings,
                "SecurityOpt": ["seccomp:unconfined"]
            }
        }
    
    def setup_workspace(self) -> None:
        """Create workspace directory if it doesn't exist"""
        os.makedirs(self.workspace_path, exist_ok=True)
    
    def get_container_name(self, project_id: str) -> str:
        """Get standardized container name for project"""
        return f"chatsparty-project-{project_id}"