"""
MCP tools that provide agents with full computer access through project VMs
"""

import logging
from typing import Any, Dict, List, Optional

from ..vm_factory import get_vm_service

logger = logging.getLogger(__name__)


class ProjectVMTools:
    """MCP tools that give agents complete VM access for project work"""

    def __init__(self, vm_service, project_id: str):
        self.vm_service = vm_service
        self.project_id = project_id

    async def execute_command(self, command: str, working_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        🔧 Execute any shell command in the project VM

        Agents can run ANY command with full system privileges:
        - Install software: apt-get install, pip install, npm install
        - Manage processes: ps, kill, nohup, systemctl
        - File operations: ls, cat, cp, mv, chmod, chown
        - Network operations: curl, wget, ping, netstat
        - Development tools: git, docker, python, node, etc.

        Args:
            command: Shell command to execute
            working_dir: Working directory (defaults to project workspace)

        Returns:
            Dict with stdout, stderr, exit_code, execution_time
        """
        try:
            result = await self.vm_service.execute_command(
                self.project_id, command, working_dir
            )

            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
                "execution_time": result.execution_time,
                "success": result.exit_code == 0
            }

        except Exception as e:
            logger.error(f"VM command execution failed: {e}")
            return {
                "stdout": "",
                "stderr": f"Tool execution error: {str(e)}",
                "exit_code": 1,
                "execution_time": 0,
                "success": False
            }

    async def read_file(self, file_path: str) -> Dict[str, Any]:
        """
        📖 Read any file from the VM filesystem

        Args:
            file_path: Path to file in VM (e.g., /workspace/app.py, /etc/hosts, /tmp/data.csv)

        Returns:
            Dict with file content or error
        """
        logger.info(f"[VM_TOOLS] 📖 Reading file for project {self.project_id}: {file_path}")
        
        try:
            content = await self.vm_service.read_file(self.project_id, file_path)
            result = {
                "content": content,
                "file_path": file_path,
                "success": True
            }
            logger.info(f"[VM_TOOLS] ✅ File read successfully, size: {len(content)} bytes")
            return result

        except Exception as e:
            logger.error(f"[VM_TOOLS] ❌ Failed to read file {file_path}: {e}")
            return {
                "content": "",
                "file_path": file_path,
                "error": str(e),
                "success": False
            }

    async def write_file(self, file_path: str, content: str, permissions: Optional[str] = None) -> Dict[str, Any]:
        """
        ✏️ Write content to any file in the VM

        Args:
            file_path: Path to file in VM
            content: File content to write
            permissions: Optional file permissions (e.g., "755", "644")

        Returns:
            Dict with success status
        """
        try:
            success = await self.vm_service.write_file(
                self.project_id, file_path, content, permissions
            )

            return {
                "file_path": file_path,
                "success": success,
                "message": f"Successfully wrote to {file_path}" if success else f"Failed to write to {file_path}"
            }

        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {e}")
            return {
                "file_path": file_path,
                "success": False,
                "error": str(e)
            }

    async def list_directory(self, path: str = "/workspace") -> Dict[str, Any]:
        """
        📁 List directory contents with detailed information

        Args:
            path: Directory path to list

        Returns:
            Dict with file listing
        """
        try:
            files = await self.vm_service.list_directory(self.project_id, path)
            return {
                "path": path,
                "files": files,
                "count": len(files),
                "success": True
            }

        except Exception as e:
            logger.error(f"Failed to list directory {path}: {e}")
            return {
                "path": path,
                "files": [],
                "count": 0,
                "error": str(e),
                "success": False
            }

    async def install_package(self, package: str, package_manager: str = "apt") -> Dict[str, Any]:
        """
        📦 Install any software package in the VM

        Supported package managers:
        - apt: System packages (apt-get install python3-pip docker.io postgresql)
        - pip/pip3: Python packages (pip install pandas tensorflow flask)
        - npm: Node.js packages (npm install -g typescript react)
        - yarn: Yarn packages (yarn global add @vue/cli)

        Args:
            package: Package name to install
            package_manager: Package manager to use

        Returns:
            Dict with installation result
        """
        logger.info(f"[VM_TOOLS] 📦 Installing package for project {self.project_id}: {package} via {package_manager}")
        
        try:
            result = await self.vm_service.install_package(
                self.project_id, package, package_manager
            )

            install_result = {
                "package": package,
                "package_manager": package_manager,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
                "success": result.exit_code == 0,
                "execution_time": result.execution_time
            }
            
            if result.exit_code == 0:
                logger.info(f"[VM_TOOLS] ✅ Package '{package}' installed successfully in {result.execution_time:.2f}s")
            else:
                logger.error(f"[VM_TOOLS] ❌ Package '{package}' installation failed with exit code {result.exit_code}")
                
            return install_result

        except Exception as e:
            logger.error(f"[VM_TOOLS] ❌ Failed to install package {package}: {e}")
            return {
                "package": package,
                "package_manager": package_manager,
                "success": False,
                "error": str(e)
            }

    async def start_service(self, service_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        🚀 Start a long-running service in the VM

        Start web servers, databases, notebooks, or any background service:
        - Web apps: {"service_name": "webapp", "command": "python app.py", "port": 5000}
        - Jupyter: {"service_name": "jupyter", "command": "jupyter lab --ip=0.0.0.0", "port": 8888}
        - Database: {"service_name": "redis", "command": "redis-server"}

        Args:
            service_config: Service configuration dict

        Returns:
            Dict with service info and URLs
        """
        try:
            result = await self.vm_service.start_service(self.project_id, service_config)
            return result

        except Exception as e:
            logger.error(f"Failed to start service: {e}")
            return {
                "service_name": service_config.get("service_name", "unknown"),
                "status": "failed",
                "error": str(e),
                "success": False
            }

    async def get_system_info(self) -> Dict[str, Any]:
        """
        💻 Get comprehensive system information about the VM

        Returns:
            Dict with system details (CPU, memory, disk, processes, network)
        """
        try:
            # Get basic sandbox info
            info = await self.vm_service.get_sandbox_info(self.project_id)

            if not info:
                return {"error": "Sandbox not available", "success": False}

            # Get additional system info
            processes = await self.execute_command("ps aux --sort=-%cpu | head -10")
            network = await self.execute_command("netstat -tlnp")
            env_vars = await self.execute_command("env | sort")

            return {
                "sandbox_info": info,
                "top_processes": processes.get("stdout", ""),
                "network_connections": network.get("stdout", ""),
                "environment_variables": env_vars.get("stdout", ""),
                "success": True
            }

        except Exception as e:
            logger.error(f"Failed to get system info: {e}")
            return {
                "error": str(e),
                "success": False
            }

    async def git_operations(self, operation: str, **kwargs) -> Dict[str, Any]:
        """
        🔄 Perform Git operations in the VM

        Supported operations:
        - clone: git clone <repo_url>
        - status: git status
        - add: git add <files>
        - commit: git commit -m "<message>"
        - push: git push
        - pull: git pull
        - log: git log --oneline -10

        Args:
            operation: Git operation to perform
            **kwargs: Additional arguments (repo_url, message, files, etc.)

        Returns:
            Dict with git command result
        """
        git_commands = {
            "clone": f"git clone {kwargs.get('repo_url', '')}",
            "status": "git status",
            "add": f"git add {kwargs.get('files', '.')}",
            "commit": f"git commit -m '{kwargs.get('message', 'Auto commit from agent')}'",
            "push": "git push",
            "pull": "git pull",
            "log": "git log --oneline -10",
            "init": "git init",
            "remote": f"git remote add origin {kwargs.get('repo_url', '')}",
            "branch": f"git checkout -b {kwargs.get('branch_name', 'main')}"
        }

        command = git_commands.get(operation)
        if not command:
            return {
                "operation": operation,
                "success": False,
                "error": f"Unsupported git operation: {operation}"
            }

        result = await self.execute_command(command)
        result["operation"] = operation

        return result

    async def create_development_environment(self, env_type: str = "full") -> Dict[str, Any]:
        """
        🛠️ Set up a complete development environment

        Environment types:
        - python: Python development with common packages
        - nodejs: Node.js development with common tools  
        - full: Complete development environment with multiple languages

        Args:
            env_type: Type of environment to set up

        Returns:
            Dict with setup results
        """
        try:
            environments = {
                "python": [
                    "apt-get update",
                    "apt-get install -y python3-pip python3-venv git curl wget",
                    "pip3 install jupyter pandas numpy matplotlib seaborn scikit-learn",
                    "pip3 install flask django fastapi uvicorn requests beautifulsoup4"
                ],
                "nodejs": [
                    "apt-get update",
                    "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
                    "apt-get install -y nodejs git curl wget",
                    "npm install -g typescript @types/node ts-node nodemon",
                    "npm install -g create-react-app @vue/cli @angular/cli"
                ],
                "full": [
                    "apt-get update",
                    "apt-get install -y python3-pip nodejs npm git curl wget vim nano htop tree",
                    "apt-get install -y docker.io postgresql-client redis-tools",
                    "pip3 install jupyter pandas numpy matplotlib flask django fastapi",
                    "npm install -g typescript ts-node nodemon create-react-app"
                ]
            }

            commands = environments.get(env_type, environments["full"])
            results = []

            for command in commands:
                result = await self.execute_command(command)
                results.append({
                    "command": command,
                    "success": result["success"],
                    "output": result["stdout"] if result["success"] else result["stderr"]
                })

            return {
                "environment_type": env_type,
                "setup_results": results,
                "success": all(r["success"] for r in results)
            }

        except Exception as e:
            logger.error(f"Failed to create development environment: {e}")
            return {
                "environment_type": env_type,
                "success": False,
                "error": str(e)
            }


def get_vm_tools_for_project(project_id: str) -> Dict[str, Any]:
    """
    Get MCP tool definitions for VM access in a project

    This provides agents with a complete computer to work with!
    """
    return {
        "execute_command": {
            "name": "execute_command",
            "description": "Execute any shell command in the project VM with full system access",
            "input_schema": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to execute"},
                    "working_dir": {"type": "string", "description": "Working directory (optional)"}
                },
                "required": ["command"]
            }
        },
        "read_file": {
            "name": "read_file",
            "description": "Read any file from the VM filesystem",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to file in VM"}
                },
                "required": ["file_path"]
            }
        },
        "write_file": {
            "name": "write_file",
            "description": "Write content to any file in the VM",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to file in VM"},
                    "content": {"type": "string", "description": "File content"},
                    "permissions": {"type": "string", "description": "File permissions (e.g., '755')"}
                },
                "required": ["file_path", "content"]
            }
        },
        "list_directory": {
            "name": "list_directory",
            "description": "List directory contents in the VM",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path to list"}
                },
                "required": ["path"]
            }
        },
        "install_package": {
            "name": "install_package",
            "description": "Install software packages in the VM",
            "input_schema": {
                "type": "object",
                "properties": {
                    "package": {"type": "string", "description": "Package name"},
                    "package_manager": {"type": "string", "description": "Package manager (apt, pip, npm, yarn)"}
                },
                "required": ["package"]
            }
        },
        "start_service": {
            "name": "start_service",
            "description": "Start a long-running service in the VM",
            "input_schema": {
                "type": "object",
                "properties": {
                    "service_config": {
                        "type": "object",
                        "description": "Service configuration",
                        "properties": {
                            "service_name": {"type": "string"},
                            "command": {"type": "string"},
                            "port": {"type": "integer"},
                            "working_directory": {"type": "string"},
                            "environment_vars": {"type": "object"}
                        }
                    }
                },
                "required": ["service_config"]
            }
        },
        "git_operations": {
            "name": "git_operations",
            "description": "Perform Git operations (clone, commit, push, pull, etc.)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "operation": {"type": "string", "description": "Git operation (clone, status, add, commit, push, pull)"},
                    "repo_url": {"type": "string", "description": "Repository URL for clone/remote operations"},
                    "message": {"type": "string", "description": "Commit message"},
                    "files": {"type": "string", "description": "Files to add"},
                    "branch_name": {"type": "string", "description": "Branch name"}
                },
                "required": ["operation"]
            }
        },
        "get_system_info": {
            "name": "get_system_info",
            "description": "Get comprehensive system information about the VM",
            "input_schema": {
                "type": "object",
                "properties": {}
            }
        },
        "create_development_environment": {
            "name": "create_development_environment",
            "description": "Set up a complete development environment (python, nodejs, full)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "env_type": {"type": "string", "description": "Environment type (python, nodejs, full)"}
                }
            }
        }
    }
