import logging
from typing import Any, Dict, List, Optional

from ..project.domain.entities import ProjectFile, VMCommandResult
from .domain.models import ContainerInfo, ContainerSystemInfo, FileTreeNode
from .implementations.command_executor import DockerCommandExecutor
from .implementations.container_manager import ContainerManager
from .implementations.file_manager import DockerFileManager
from .implementations.file_manager_optimized import OptimizedDockerFileManager

logger = logging.getLogger(__name__)


class DockerFacade:
    """
    Facade for Docker container operations, providing VM services
    for project workspaces
    """

    def __init__(self):
        self.container_manager = ContainerManager()
        self.file_manager = DockerFileManager(self.container_manager)
        self.optimized_file_manager = OptimizedDockerFileManager(self.container_manager)
        self.command_executor = DockerCommandExecutor(self.container_manager)
        
    async def close(self):
        """Close Docker client connections"""
        await self.container_manager.close()

    async def create_project_sandbox(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new Docker container for a project"""
        logger.info(f"[VM] Creating sandbox for project {project_id} with environment: {environment_type}")
        container_info = await self.container_manager.create_project_container(
            project_id, template_id, environment_type
        )
        logger.info(f"[VM] Sandbox created successfully for project {project_id}: {container_info.container_id[:12]}")
        return {
            "sandbox_id": container_info.container_id,
            "status": container_info.status,
            "workspace_path": container_info.workspace_path,
            "environment_type": container_info.environment_type,
            "vm_url": f"http://localhost:{container_info.ports.get('3000/tcp', container_info.ports.get('8080/tcp', container_info.ports.get('8000/tcp', 8000)))}",
            "created_at": container_info.created_at,
            "ports": container_info.ports
        }

    async def reconnect_to_sandbox(
        self,
        project_id: str,
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing Docker container"""
        logger.info(f"[VM] Attempting to reconnect to sandbox {sandbox_id} for project {project_id}")
        try:
            result = await self.container_manager.start_container(project_id)
            if result:
                logger.info(f"[VM] Successfully reconnected to sandbox {sandbox_id} for project {project_id}")
            else:
                logger.warning(f"[VM] Failed to reconnect to sandbox {sandbox_id} for project {project_id}")
            return result
        except Exception as e:
            logger.error(f"[VM] Error reconnecting to container {sandbox_id}: {e}")
            return False

    async def get_or_reconnect_sandbox(
        self,
        project_id: str,
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing container or attempt to reconnect"""
        if await self.container_manager.is_container_active(project_id):
            return True

        if sandbox_id:
            return await self.reconnect_to_sandbox(project_id, sandbox_id)

        return False

    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy a container and clean up resources"""
        logger.info(f"[VM] Destroying sandbox for project {project_id}")
        result = await self.container_manager.destroy_container(project_id)
        if result:
            logger.info(f"[VM] Sandbox destroyed successfully for project {project_id}")
        else:
            logger.warning(f"[VM] Failed to destroy sandbox for project {project_id}")
        return result

    async def is_sandbox_active(self, project_id: str) -> bool:
        """Check if container is active for project"""
        return await self.container_manager.is_container_active(project_id)

    async def get_sandbox_info(
        self,
        project_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get information about the project's container"""
        info = await self.container_manager.get_container_info(project_id)
        if not info:
            return None

        return {
            "sandbox_id": info.container_id,
            "hostname": info.hostname,
            "cpu_cores": info.cpu_cores,
            "memory_info": info.memory_info,
            "disk_info": info.disk_info,
            "uptime": info.uptime,
            "workspace_path": info.workspace_path
        }

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate container"""
        return await self.container_manager.cleanup_container(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the container for a project"""
        return await self.destroy_sandbox(project_id)

    async def sync_files_to_vm(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the container workspace"""
        return await self.file_manager.sync_files_to_container(project_id, files)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from container filesystem"""
        return await self.file_manager.read_file(project_id, file_path)

    async def write_file(
        self,
        project_id: str,
        file_path: str,
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in container filesystem"""
        return await self.file_manager.write_file(
            project_id, file_path, content, permissions
        )

    async def list_directory(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in container"""
        items = await self.file_manager.list_directory(project_id, path)
        return [
            {
                "permissions": item.permissions,
                "links": item.links,
                "owner": item.owner,
                "group": item.group,
                "size": item.size,
                "date": item.date,
                "name": item.name
            }
            for item in items
        ]

    async def list_files_recursive(
        self,
        project_id: str,
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        tree = await self.file_manager.list_files_recursive(project_id, path)
        return self._convert_tree_to_dict(tree)

    def _convert_tree_to_dict(self, node: FileTreeNode) -> Dict[str, Any]:
        """Convert FileTreeNode to dictionary"""
        result = {
            "name": node.name,
            "path": node.path,
            "type": node.type
        }
        if node.children:
            result["children"] = [
                self._convert_tree_to_dict(child) for child in node.children
            ]
        return result

    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in project container"""
        logger.info(f"[VM] Executing command for project {project_id}: {command}")
        result = await self.command_executor.execute_command(
            project_id, command, working_dir, timeout
        )
        logger.info(f"[VM] Command completed for project {project_id} with exit code: {result.exit_code}")
        if result.exit_code != 0:
            logger.warning(f"[VM] Command failed for project {project_id}: {result.stderr[:200]}")
        return result

    async def install_package(
        self,
        project_id: str,
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the container"""
        return await self.command_executor.install_package(
            project_id, package, package_manager
        )

    async def start_service(
        self,
        project_id: str,
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the container"""
        service_name = service_config["service_name"]
        command = service_config["command"]
        port = service_config.get("port")

        try:
            start_command = f"nohup {command} > /tmp/{service_name}.log 2>&1 & echo $!"
            result = await self.execute_command(project_id, start_command)

            if result.exit_code == 0:
                process_id = int(result.stdout.strip()) if result.stdout.strip().isdigit() else None
                
                container = await self.container_manager.get_container(project_id)
                service_url = None
                if port and container:
                    container.reload()
                    host_port = None
                    for container_port, bindings in (container.ports or {}).items():
                        if container_port.startswith(str(port)):
                            if bindings:
                                host_port = bindings[0]['HostPort']
                                break
                    if host_port:
                        service_url = f"http://localhost:{host_port}"

                return {
                    "service_name": service_name,
                    "status": "running",
                    "process_id": process_id,
                    "service_url": service_url,
                    "log_file": f"/tmp/{service_name}.log"
                }
            else:
                return {
                    "service_name": service_name,
                    "status": "failed",
                    "error": result.stderr
                }

        except Exception as e:
            logger.error(f"Failed to start service {service_name}: {e}")
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
            logger.error(f"Failed to stop service with PID {process_id}: {e}")
            return False
    
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports in the container"""
        try:
            result = await self.execute_command(
                project_id, 
                "ss -tlnp 2>/dev/null | grep LISTEN || netstat -tlnp 2>/dev/null | grep LISTEN"
            )
            
            if result.exit_code != 0:
                logger.warning(f"Failed to get active ports: {result.stderr}")
                return {}
            
            active_ports = {}
            lines = result.stdout.strip().split('\n')
            
            for line in lines:
                parts = line.split()
                if len(parts) >= 4:
                    addr_part = None
                    for part in parts:
                        if ':' in part and not part.startswith('::'):
                            addr_part = part
                            break
                    
                    if addr_part:
                        try:
                            port = int(addr_part.split(':')[-1])
                            if 1024 < port < 65536:
                                process_name = "unknown"
                                for part in parts:
                                    if '/' in part:
                                        process_name = part.split('/')[-1]
                                        break
                                
                                active_ports[port] = {
                                    "port": port,
                                    "process": process_name,
                                    "address": addr_part
                                }
                        except ValueError:
                            continue
            
            container = await self.container_manager.get_container(project_id)
            if container:
                container_info = await container.show()
                if "NetworkSettings" in container_info and "Ports" in container_info["NetworkSettings"]:
                    ports = container_info["NetworkSettings"]["Ports"]
                    for container_port, host_bindings in ports.items():
                        if host_bindings:
                            port_num = int(container_port.split('/')[0])
                            if port_num in active_ports:
                                active_ports[port_num]["host_port"] = int(host_bindings[0]["HostPort"])
                                active_ports[port_num]["url"] = f"http://localhost:{host_bindings[0]['HostPort']}"
            
            logger.info(f"Active ports in container {project_id}: {active_ports}")
            return active_ports
            
        except Exception as e:
            logger.error(f"Error getting active ports: {e}")
            return {}
    
    async def list_directory_children(self, project_id: str, path: str = "/workspace") -> List[Dict[str, Any]]:
        """List only immediate children of a directory"""
        return await self.optimized_file_manager.list_directory_children(project_id, path)