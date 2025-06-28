import logging
import asyncio
from typing import Dict, List, Optional, Any

from ...docker.docker_facade import DockerFacade
from ...project.domain.entities import ProjectFile, VMCommandResult
from ..interfaces.vm_provider import VMProviderInterface

logger = logging.getLogger(__name__)


class DockerProvider(VMProviderInterface):
    """Docker implementation of VM provider interface"""
    
    def __init__(self):
        self.docker_facade = DockerFacade()
        logger.info("[DOCKER_PROVIDER] Docker provider initialized")

    async def create_project_sandbox(
        self, 
        project_id: str, 
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new Docker container for a project"""
        logger.info(f"[DOCKER_PROVIDER] Creating sandbox for project {project_id}")
        return await self.docker_facade.create_project_sandbox(
            project_id, template_id, environment_type
        )

    async def reconnect_to_sandbox(
        self, 
        project_id: str, 
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing Docker container"""
        logger.info(f"[DOCKER_PROVIDER] Reconnecting to sandbox {sandbox_id} for project {project_id}")
        return await self.docker_facade.reconnect_to_sandbox(project_id, sandbox_id)

    async def get_or_reconnect_sandbox(
        self, 
        project_id: str, 
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing container or attempt to reconnect"""
        return await self.docker_facade.get_or_reconnect_sandbox(project_id, sandbox_id)

    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy Docker container and clean up resources"""
        logger.info(f"[DOCKER_PROVIDER] Destroying sandbox for project {project_id}")
        return await self.docker_facade.destroy_sandbox(project_id)

    async def is_sandbox_active(self, project_id: str) -> bool:
        """Check if Docker container is active for project"""
        return await self.docker_facade.is_sandbox_active(project_id)

    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's Docker container"""
        return await self.docker_facade.get_sandbox_info(project_id)

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate Docker container"""
        return await self.docker_facade.cleanup_sandbox(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the Docker container for a project"""
        return await self.docker_facade.destroy_project_sandbox(project_id)

    async def sync_files_to_vm(
        self, 
        project_id: str, 
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the Docker container workspace"""
        return await self.docker_facade.sync_files_to_vm(project_id, files)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from Docker container filesystem"""
        return await self.docker_facade.read_file(project_id, file_path)

    async def write_file(
        self, 
        project_id: str, 
        file_path: str, 
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in Docker container filesystem"""
        return await self.docker_facade.write_file(project_id, file_path, content, permissions)


    

    async def execute_command(
        self, 
        project_id: str, 
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in Docker container"""
        return await self.docker_facade.execute_command(project_id, command, working_dir, timeout)

    async def install_package(
        self, 
        project_id: str, 
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the Docker container"""
        return await self.docker_facade.install_package(project_id, package, package_manager)

    async def start_service(
        self, 
        project_id: str, 
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the Docker container"""
        return await self.docker_facade.start_service(project_id, service_config)

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        return await self.docker_facade.stop_service(project_id, process_id)
    
    async def kill_process_by_port(self, project_id: str, port: int) -> bool:
        """Kill process listening on specific port"""
        return await self.docker_facade.kill_process_by_port(project_id, port)
    
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports in the Docker container"""
        return await self.docker_facade.get_active_ports(project_id)


    







    async def get_container_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get container information"""
        try:
            container = await self.docker_facade.container_manager.get_container(project_id)
            
            if container:
                return {
                    "id": container.id,
                    "name": container.name,
                    "status": container.status,
                    "image": container.image.tags[0] if container.image.tags else "unknown"
                }
        except Exception:
            pass
        return None

    # ============= IDE MANAGEMENT =============
    
    async def setup_ide_server(
        self, 
        project_id: str, 
        ide_type: str = "vscode",
        port: int = 8080
    ) -> Dict[str, Any]:
        """Start pre-installed IDE server in the container"""
        try:
            logger.info(f"Starting {ide_type} IDE server for project {project_id} on port {port}")
            
            # Check if container is running
            if not await self.is_sandbox_active(project_id):
                raise ValueError(f"Container for project {project_id} is not active")
            
            # Check if IDE is already running
            if await self.is_ide_running(project_id):
                logger.info(f"IDE server already running for project {project_id}")
                ide_status = await self.get_ide_status(project_id)
                return ide_status
            
            if ide_type == "vscode":
                return await self._start_vscode_server(project_id, port)
            else:
                raise ValueError(f"Unsupported IDE type: {ide_type}")
                
        except Exception as e:
            logger.error(f"Failed to start IDE server for project {project_id}: {str(e)}")
            raise

    async def _start_vscode_server(self, project_id: str, port: int = 8080) -> Dict[str, Any]:
        """Start pre-installed VS Code server"""
        try:
            logger.info(f"Starting VS Code server for project {project_id}")
            
            # Start code-server in background (assuming it's pre-installed)
            start_command = f"""
            nohup code-server \
                --bind-addr 0.0.0.0:{port} \
                --auth none \
                --disable-telemetry \
                --disable-update-check \
                --disable-workspace-trust \
                /workspace > /tmp/code-server.log 2>&1 &
            """
            
            start_result = await self.execute_command(project_id, start_command.strip())
            
            if start_result.exit_code != 0:
                logger.error(f"Failed to start code-server: {start_result.stderr}")
                raise RuntimeError(f"Failed to start code-server: {start_result.stderr}")
            
            # Wait a moment for server to start
            await asyncio.sleep(2)
            
            # Get the mapped port
            host_port = await self._get_host_port(project_id, port)
            
            if not host_port:
                logger.warning(f"Could not determine host port for project {project_id}, using {port}")
                host_port = port
            
            ide_url = f"http://localhost:{host_port}"
            
            logger.info(f"VS Code server started for project {project_id} at {ide_url}")
            
            return {
                "ide_type": "vscode",
                "url": ide_url,
                "port": host_port,
                "container_port": port,
                "status": "running",
                "workspace_path": "/workspace"
            }
            
        except Exception as e:
            logger.error(f"Failed to start VS Code server: {str(e)}")
            raise

    async def get_ide_status(self, project_id: str) -> Dict[str, Any]:
        """Get IDE server status and connection information"""
        try:
            # Check if any IDE servers are running
            active_ports = await self.get_active_ports(project_id)
            
            # Common IDE ports
            ide_ports = {
                8080: "vscode",     # code-server default
                3000: "theia",      # Theia default
                8000: "jupyter",    # Jupyter default
                9000: "eclipse"     # Eclipse Che
            }
            
            running_ides = []
            for port, process_info in active_ports.items():
                if port in ide_ports:
                    host_port = await self._get_host_port(project_id, port)
                    
                    running_ides.append({
                        "ide_type": ide_ports[port],
                        "url": f"http://localhost:{host_port or port}",
                        "port": host_port or port,
                        "container_port": port,
                        "status": "running",
                        "process_info": process_info
                    })
            
            if running_ides:
                # Return the first running IDE (usually VS Code)
                return running_ides[0]
            else:
                return {
                    "status": "not_running",
                    "available_ides": list(ide_ports.values())
                }
                
        except Exception as e:
            logger.error(f"Failed to get IDE status for project {project_id}: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def stop_ide_server(self, project_id: str) -> bool:
        """Stop the IDE server"""
        try:
            logger.info(f"Stopping IDE server for project {project_id}")
            
            # Get active IDE ports and stop them
            active_ports = await self.get_active_ports(project_id)
            ide_ports = [8080, 3000, 8000, 9000]  # Common IDE ports
            
            stopped_any = False
            for port in ide_ports:
                if port in active_ports:
                    success = await self.kill_process_by_port(project_id, port)
                    if success:
                        logger.info(f"Stopped IDE server on port {port}")
                        stopped_any = True
                    else:
                        logger.warning(f"Failed to stop IDE server on port {port}")
            
            if not stopped_any:
                logger.info(f"No IDE servers found running for project {project_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop IDE server for project {project_id}: {str(e)}")
            return False

    async def is_ide_running(self, project_id: str) -> bool:
        """Check if IDE server is currently running"""
        try:
            active_ports = await self.get_active_ports(project_id)
            ide_ports = [8080, 3000, 8000, 9000]  # Common IDE ports
            
            return any(port in active_ports for port in ide_ports)
            
        except Exception as e:
            logger.error(f"Failed to check IDE status for project {project_id}: {str(e)}")
            return False

    async def _get_host_port(self, project_id: str, container_port: int) -> Optional[int]:
        """Get the host port mapped to a container port"""
        try:
            # Use the active ports functionality which already exists
            active_ports = await self.docker_facade.get_active_ports(project_id)
            
            if container_port in active_ports:
                port_info = active_ports[container_port]
                if 'host_port' in port_info:
                    return port_info['host_port']
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get host port for project {project_id}: {str(e)}")
            return None
    
