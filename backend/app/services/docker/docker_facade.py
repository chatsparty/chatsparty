import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..project.domain.entities import VMCommandResult
from .implementations.command_executor import DockerCommandExecutor
from .implementations.container_manager import ContainerManager

logger = logging.getLogger(__name__)

class DockerFacade:
    """
    Facade for Docker container operations, providing VM services
    for project workspaces
    """
    
    def __init__(self):
        self.container_manager = ContainerManager()
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
            if result.exit_code == 0:
                logger.info(f"Successfully sent SIGTERM to process {process_id}")
                await asyncio.sleep(2)
                
                check_result = await self.execute_command(project_id, f"kill -0 {process_id}")
                if check_result.exit_code != 0:
                    logger.info(f"Process {process_id} terminated gracefully")
                    return True
                
                logger.info(f"Process {process_id} still running, sending SIGKILL")
                force_result = await self.execute_command(project_id, f"kill -9 {process_id}")
                return force_result.exit_code == 0
            else:
                logger.warning(f"Failed to send SIGTERM to process {process_id}: {result.stderr}")
                return False

        except Exception as e:
            logger.error(f"Failed to stop service with PID {process_id}: {e}")
            return False
            
    async def kill_process_by_port(self, project_id: str, port: int) -> bool:
        """Kill process listening on specific port"""
        try:
            active_ports = await self.get_active_ports(project_id)
            if port in active_ports and active_ports[port].get("process_id"):
                process_id = active_ports[port]["process_id"]
                logger.info(f"Killing process {process_id} listening on port {port}")
                return await self.stop_service(project_id, process_id)
            else:
                logger.warning(f"No process found listening on port {port}")
                return False
        except Exception as e:
            logger.error(f"Failed to kill process on port {port}: {e}")
            return False
    
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports using the monitoring agent (much more reliable)"""
        try:
            result = await self.execute_command(
                project_id, 
                "python3 /tmp/monitoring_agent.py"
            )
            
            if result.exit_code != 0:
                logger.warning(f"Monitoring agent failed, falling back to /proc parsing: {result.stderr}")
                return await self._get_active_ports_fallback(project_id)
            
            try:
                import json
                monitoring_data = json.loads(result.stdout)
                active_ports = monitoring_data.get("active_ports", {})
                
                system_metrics = monitoring_data.get("system_metrics", {})
                if system_metrics:
                    logger.debug(f"[VM] System metrics for {project_id}: CPU {system_metrics.get('cpu_percent', 0):.1f}%, Memory {system_metrics.get('memory_percent', 0):.1f}%")
                
                active_ports_int = {}
                for port_str, details in active_ports.items():
                    try:
                        port_int = int(port_str)
                        active_ports_int[port_int] = details
                    except ValueError:
                        continue
                
                return await self._add_port_mappings(project_id, active_ports_int)
                
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse monitoring agent JSON: {e}, falling back to /proc parsing")
                return await self._get_active_ports_fallback(project_id)
                
        except Exception as e:
            logger.error(f"Error getting active ports with monitoring agent: {e}")
            return await self._get_active_ports_fallback(project_id)

    async def _get_active_ports_fallback(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Fallback method using /proc/net/tcp parsing"""
        try:
            result = await self.execute_command(
                project_id, 
                "cat /proc/net/tcp 2>/dev/null | awk '$4==\"0A\" {print $2}' | cut -d: -f2"
            )
            
            if result.exit_code != 0:
                logger.warning(f"Fallback /proc parsing also failed: {result.stderr}")
                return {}
            
            active_ports = {}
            if not result.stdout.strip():
                return {}
            
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line.strip():
                    try:
                        port = int(line.strip(), 16)
                        if 1024 < port < 65536:
                            active_ports[port] = {
                                "port": port,
                                "process": "unknown",
                                "process_id": None,
                                "address": f"0.0.0.0:{port}",
                                "service_name": f"service:{port}",
                                "status": "running"
                            }
                    except ValueError:
                        continue
            
            return await self._add_port_mappings(project_id, active_ports)
            
        except Exception as e:
            logger.error(f"Fallback port detection failed: {e}")
            return {}

    async def _add_port_mappings(self, project_id: str, active_ports: Dict[int, Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
        """Add Docker port mappings to active ports and handle dynamic exposure"""
        try:
            container = await self.container_manager.ensure_container_running(project_id)
            if container:
                container_info = await container.show()
                existing_ports = container_info.get("NetworkSettings", {}).get("Ports", {})
                
                ports_to_expose = []
                for port in active_ports.keys():
                    port_key = f"{port}/tcp"
                    if port_key not in existing_ports or not existing_ports[port_key]:
                        ports_to_expose.append(port)
                
                if ports_to_expose:
                    logger.info(f"[VM] 🔍 Discovered new ports {ports_to_expose} for project {project_id}, queuing for background exposure...")
                    
                    from .background_port_service import get_background_port_service
                    port_service = get_background_port_service()
                    
                    for port in ports_to_expose:
                        task_id = port_service.queue_port_exposure(project_id, port)
                        logger.info(f"[VM] 📋 Queued port {port} exposure with task_id: {task_id}")
                
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
            logger.error(f"Error adding port mappings: {e}")
            return active_ports