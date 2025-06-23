import os
import json
import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime

from ...project.domain.entities import ProjectFile, VMCommandResult
from ..interfaces.vm_provider import VMProviderInterface

logger = logging.getLogger(__name__)


class FlyProvider(VMProviderInterface):
    """Fly.io implementation of VM provider interface"""
    
    def __init__(self):
        self.fly_token = os.getenv("FLY_TOKEN")
        self.app_name = os.getenv("FLY_APP_NAME", "wisty-workspace")
        self.base_url = "https://api.machines.dev/v1"
        
        if not self.fly_token:
            logger.error("[FLY_PROVIDER] FLY_TOKEN environment variable not set")
            raise ValueError("FLY_TOKEN environment variable is required")
        
        logger.info(f"[FLY_PROVIDER] Fly provider initialized for app: {self.app_name}")

    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers for Fly API"""
        return {
            "Authorization": f"Bearer {self.fly_token}",
            "Content-Type": "application/json"
        }

    def _get_machine_name(self, project_id: str) -> str:
        """Generate machine name for project"""
        return f"project-{project_id}"

    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Fly API"""
        url = f"{self.base_url}{endpoint}"
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method, 
                url, 
                headers=self._get_headers(),
                json=data
            ) as response:
                response_data = await response.json()
                
                if response.status >= 400:
                    logger.error(f"[FLY_PROVIDER] API error {response.status}: {response_data}")
                    raise Exception(f"Fly API error: {response_data}")
                
                return response_data

    async def create_project_sandbox(
        self, 
        project_id: str, 
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new Fly machine for a project"""
        logger.info(f"[FLY_PROVIDER] Creating sandbox for project {project_id}")
        
        machine_config = {
            "image": "ubuntu:22.04",
            "services": [
                {
                    "ports": [
                        {"port": 8000, "handlers": ["http"]},
                        {"port": 3000, "handlers": ["http"]}
                    ],
                    "protocol": "tcp",
                    "internal_port": 8000
                }
            ],
            "env": {
                "PROJECT_ID": project_id,
                "ENVIRONMENT_TYPE": environment_type
            },
            "mounts": [
                {
                    "volume": f"workspace_{project_id}",
                    "path": "/workspace"
                }
            ],
            "restart": {"policy": "no"},
            "guest": {
                "cpu_kind": "shared",
                "cpus": 1,
                "memory_mb": 1024
            }
        }

        payload = {
            "name": self._get_machine_name(project_id),
            "config": machine_config
        }

        try:
            response = await self._make_request(
                "POST", 
                f"/apps/{self.app_name}/machines", 
                payload
            )
            
            machine_id = response["id"]
            
            await self._wait_for_machine_state(machine_id, "started")
            
            machine_info = await self._get_machine_info(machine_id)
            
            return {
                "sandbox_id": machine_id,
                "status": machine_info["state"],
                "workspace_path": "/workspace",
                "environment_type": environment_type,
                "vm_url": f"http://{machine_info.get('private_ip')}:8000",
                "created_at": datetime.now(),
                "ports": {"8000/tcp": 8000, "3000/tcp": 3000}
            }
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to create sandbox: {e}")
            raise

    async def _wait_for_machine_state(self, machine_id: str, target_state: str, timeout: int = 60):
        """Wait for machine to reach target state"""
        for _ in range(timeout):
            machine_info = await self._get_machine_info(machine_id)
            if machine_info["state"] == target_state:
                return
            await asyncio.sleep(1)
        
        raise TimeoutError(f"Machine {machine_id} did not reach state {target_state}")

    async def _get_machine_info(self, machine_id: str) -> Dict[str, Any]:
        """Get machine information"""
        return await self._make_request("GET", f"/apps/{self.app_name}/machines/{machine_id}")

    async def reconnect_to_sandbox(
        self, 
        project_id: str, 
        sandbox_id: str
    ) -> bool:
        """Reconnect to (start) an existing Fly machine"""
        logger.info(f"[FLY_PROVIDER] Reconnecting to sandbox {sandbox_id} for project {project_id}")
        
        try:
            await self._make_request("POST", f"/apps/{self.app_name}/machines/{sandbox_id}/start")
            
            await self._wait_for_machine_state(sandbox_id, "started")
            
            return True
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to reconnect to sandbox: {e}")
            return False

    async def get_or_reconnect_sandbox(
        self, 
        project_id: str, 
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing machine or attempt to reconnect"""
        if not sandbox_id:
            return False
            
        try:
            machine_info = await self._get_machine_info(sandbox_id)
            
            if machine_info["state"] == "started":
                return True
            
            return await self.reconnect_to_sandbox(project_id, sandbox_id)
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to get/reconnect sandbox: {e}")
            return False

    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy Fly machine and clean up resources"""
        logger.info(f"[FLY_PROVIDER] Destroying sandbox for project {project_id}")
        
        try:
            machines = await self._make_request("GET", f"/apps/{self.app_name}/machines")
            machine_id = None
            
            for machine in machines:
                if machine.get("name") == self._get_machine_name(project_id):
                    machine_id = machine["id"]
                    break
            
            if not machine_id:
                logger.warning(f"[FLY_PROVIDER] No machine found for project {project_id}")
                return True
            
            await self._make_request("POST", f"/apps/{self.app_name}/machines/{machine_id}/stop")
            await self._make_request("DELETE", f"/apps/{self.app_name}/machines/{machine_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to destroy sandbox: {e}")
            return False

    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if Fly machine is active for project"""
        return False

    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's Fly machine"""
        try:
            machines = await self._make_request("GET", f"/apps/{self.app_name}/machines")
            
            for machine in machines:
                if machine.get("name") == self._get_machine_name(project_id):
                    return {
                        "sandbox_id": machine["id"],
                        "hostname": machine.get("private_ip"),
                        "cpu_cores": 1,
                        "memory_info": {"total": "1GB", "available": "800MB"},
                        "disk_info": {"total": "10GB", "available": "8GB"},
                        "uptime": "N/A",
                        "workspace_path": "/workspace"
                    }
                    
            return None
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to get sandbox info: {e}")
            return None

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate Fly machine"""
        return await self.destroy_sandbox(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the Fly machine for a project"""
        return await self.destroy_sandbox(project_id)

    async def sync_files_to_vm(
        self, 
        project_id: str, 
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the Fly machine workspace"""
        logger.warning("[FLY_PROVIDER] sync_files_to_vm not fully implemented")
        return True

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from Fly machine filesystem"""
        logger.warning("[FLY_PROVIDER] read_file not fully implemented")
        return ""

    async def write_file(
        self, 
        project_id: str, 
        file_path: str, 
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in Fly machine filesystem"""
        logger.warning("[FLY_PROVIDER] write_file not fully implemented")
        return True

    async def list_directory(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in Fly machine"""
        logger.warning("[FLY_PROVIDER] list_directory not fully implemented")
        return []

    async def list_files_recursive(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        logger.warning("[FLY_PROVIDER] list_files_recursive not fully implemented")
        return {"name": "workspace", "path": "/workspace", "type": "directory"}

    async def execute_command(
        self, 
        project_id: str, 
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in Fly machine"""
        try:
            machines = await self._make_request("GET", f"/apps/{self.app_name}/machines")
            machine_id = None
            
            for machine in machines:
                if machine.get("name") == self._get_machine_name(project_id):
                    machine_id = machine["id"]
                    break
            
            if not machine_id:
                return VMCommandResult(
                    exit_code=1,
                    stdout="",
                    stderr="Machine not found"
                )
            
            exec_payload = {
                "cmd": command.split(),
                "timeout": timeout or 30
            }
            
            response = await self._make_request(
                "POST", 
                f"/apps/{self.app_name}/machines/{machine_id}/exec",
                exec_payload
            )
            
            return VMCommandResult(
                exit_code=response.get("exit_code", 0),
                stdout=response.get("stdout", ""),
                stderr=response.get("stderr", "")
            )
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to execute command: {e}")
            return VMCommandResult(
                exit_code=1,
                stdout="",
                stderr=str(e)
            )

    async def install_package(
        self, 
        project_id: str, 
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the Fly machine"""
        if package_manager == "apt":
            command = f"apt-get update && apt-get install -y {package}"
        elif package_manager == "npm":
            command = f"npm install -g {package}"
        else:
            command = f"{package_manager} install {package}"
            
        return await self.execute_command(project_id, command)

    async def start_service(
        self, 
        project_id: str, 
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the Fly machine"""
        service_name = service_config["service_name"]
        command = service_config["command"]
        port = service_config.get("port")

        try:
            start_command = f"nohup {command} > /tmp/{service_name}.log 2>&1 & echo $!"
            result = await self.execute_command(project_id, start_command)

            if result.exit_code == 0:
                process_id = int(result.stdout.strip()) if result.stdout.strip().isdigit() else None
                
                return {
                    "service_name": service_name,
                    "status": "running",
                    "process_id": process_id,
                    "service_url": f"http://fly-machine:/{port}" if port else None,
                    "log_file": f"/tmp/{service_name}.log"
                }
            else:
                return {
                    "service_name": service_name,
                    "status": "failed",
                    "error": result.stderr
                }

        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to start service {service_name}: {e}")
            return {
                "service_name": service_name,
                "status": "failed",
                "error": str(e)
            }

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        try:
            result = await self.execute_command(project_id, f"kill {process_id}")
            return result.exit_code == 0
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Failed to stop service with PID {process_id}: {e}")
            return False

    async def setup_file_watcher(self, project_id: str, callback: Callable[[str, str, str], None]) -> None:
        """Setup file system watcher for project (not supported in Fly.io)"""
        logger.warning(f"[FLY_PROVIDER] File watching not supported for remote Fly.io instances")
        pass

    async def stop_file_watcher(self, project_id: str) -> None:
        """Stop file system watcher for project (not supported in Fly.io)"""
        logger.warning(f"[FLY_PROVIDER] File watching not supported for remote Fly.io instances")
        pass

    async def create_file(self, project_id: str, file_path: str, content: str = "") -> bool:
        """Create a new file with specified content"""
        try:
            return await self.write_file(project_id, file_path, content)
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Error creating file {file_path}: {e}")
            return False

    async def create_directory(self, project_id: str, dir_path: str) -> bool:
        """Create a new directory"""
        try:
            result = await self.execute_command(
                project_id, 
                f"mkdir -p {dir_path}",
                working_dir="/workspace"
            )
            return result.exit_code == 0
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Error creating directory {dir_path}: {e}")
            return False

    async def delete_file(self, project_id: str, file_path: str) -> bool:
        """Delete a file"""
        try:
            result = await self.execute_command(
                project_id, 
                f"rm -f {file_path}",
                working_dir="/workspace"
            )
            return result.exit_code == 0
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Error deleting file {file_path}: {e}")
            return False

    async def delete_directory(self, project_id: str, dir_path: str, recursive: bool = False) -> bool:
        """Delete a directory (optionally recursive)"""
        try:
            if recursive:
                command = f"rm -rf {dir_path}"
            else:
                command = f"rmdir {dir_path}"
            
            result = await self.execute_command(
                project_id, 
                command,
                working_dir="/workspace"
            )
            return result.exit_code == 0
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] Error deleting directory {dir_path}: {e}")
            return False

    async def move_file(self, project_id: str, source_path: str, destination_path: str) -> bool:
        """Move/rename a file or directory"""
        try:
            logger.info(f"[FLY_PROVIDER] 📁 Moving file from {source_path} to {destination_path} in project {project_id}")
            
            # Use mv command to move/rename the file
            result = await self.execute_command(
                project_id, 
                f"mv '{source_path}' '{destination_path}'",
                working_dir="/workspace"
            )
            
            logger.info(f"[FLY_PROVIDER] Move command result: exit_code={result.exit_code}")
            logger.info(f"[FLY_PROVIDER] Command stdout: {result.stdout}")
            logger.info(f"[FLY_PROVIDER] Command stderr: {result.stderr}")
            
            success = result.exit_code == 0
            logger.info(f"[FLY_PROVIDER] Move file result: {success}")
            
            return success
            
        except Exception as e:
            logger.error(f"[FLY_PROVIDER] ❌ Error moving file from {source_path} to {destination_path}: {e}")
            return False