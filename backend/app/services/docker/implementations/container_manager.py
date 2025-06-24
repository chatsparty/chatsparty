import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, Optional

import aiodocker
from aiodocker.containers import DockerContainer

from ..domain.models import ContainerInfo, ContainerSystemInfo
from ..interfaces.container_manager import IContainerManager

logger = logging.getLogger(__name__)


class ContainerManager(IContainerManager):
    """Implementation of container management for Docker"""

    def __init__(self):
        self.docker_client: Optional[aiodocker.Docker] = None
        self.active_containers: Dict[str, DockerContainer] = {}
        self.base_image = "node:20-bookworm"
        
    async def _exec_command(self, container, cmd, **kwargs):
        """Helper method to execute commands in aiodocker container"""
        try:
            exec_obj = await container.exec(cmd, **kwargs)
            stream = exec_obj.start(detach=False)
            
            output_chunks = []
            async with stream:
                while True:
                    try:
                        msg = await asyncio.wait_for(stream.read_out(), timeout=5.0)
                        if msg is None:
                            break
                        if hasattr(msg, 'data'):
                            output_chunks.append(msg.data)
                        else:
                            output_chunks.append(msg)
                    except asyncio.TimeoutError:
                        logger.warning(f"Timeout reading stream for command: {cmd}")
                        break
            
            output_bytes = b"".join(output_chunks)
            
            inspect_result = await exec_obj.inspect()
            exit_code = inspect_result.get("ExitCode", 0)
            
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(output_bytes, exit_code)
        except Exception as e:
            logger.error(f"Error executing command {cmd}: {e}")
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(b"", 1)
        
    async def _get_docker_client(self) -> aiodocker.Docker:
        """Get or create Docker client"""
        if self.docker_client is None:
            try:
                self.docker_client = aiodocker.Docker()
                await self.docker_client.version()
                logger.info("aiodocker client connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Docker with aiodocker: {e}")
                raise
        return self.docker_client
        
    async def close(self):
        """Close Docker client connection"""
        if self.docker_client:
            await self.docker_client.close()
            self.docker_client = None

    async def create_project_container(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> ContainerInfo:
        """Create a new Docker container for a project"""
        docker = await self._get_docker_client()
        
        try:
            logger.info(f"[VM] Starting container creation process for project {project_id}")
            logger.info(f"[VM] Environment type: {environment_type}, Template: {template_id}")

            container_name = f"chatsparty-project-{project_id}"
            logger.info(f"[VM] Container name: {container_name}")

            try:
                existing_container = await docker.containers.get(container_name)
                logger.info(f"[VM] Found existing container {container_name}, removing it first")
                await existing_container.delete(force=True)
                logger.info(f"[VM] Existing container removed successfully")
            except aiodocker.DockerError as e:
                if e.status == 404:
                    logger.info(f"[VM] No existing container found with name {container_name}")
                else:
                    logger.warning(f"[VM] Failed to remove existing container: {e}")

            workspace_path = "/tmp/chatsparty/workspace"
            logger.info(f"[VM] Creating workspace directory: {workspace_path}")
            os.makedirs(workspace_path, exist_ok=True)
            logger.info(f"[VM] Workspace directory created successfully")

            logger.info(f"[VM] Base image: {self.base_image}")
            logger.info(f"[VM] Starting container with aiodocker...")
            
            container_config = {
                "Image": self.base_image,
                "Cmd": ["tail", "-f", "/dev/null"],
                "WorkingDir": "/workspace",
                "Env": [
                    f"PROJECT_ID={project_id}",
                    "DEBIAN_FRONTEND=noninteractive",
                    "HOME=/workspace"
                ],
                "User": "root",
                "HostConfig": {
                    "Memory": 2147483648,
                    "CpuQuota": 100000,
                    "Binds": [f"{workspace_path}:/workspace:rw"],
                    "PortBindings": {
                        "3000/tcp": [{"HostPort": ""}],
                        "8000/tcp": [{"HostPort": ""}],
                        "5000/tcp": [{"HostPort": ""}],
                        "8080/tcp": [{"HostPort": ""}],
                    },
                    "SecurityOpt": ["seccomp:unconfined"]
                },
                "ExposedPorts": {
                    "3000/tcp": {},
                    "8000/tcp": {},
                    "5000/tcp": {},
                    "8080/tcp": {},
                }
            }
            
            container = await docker.containers.create(
                config=container_config,
                name=container_name
            )
            
            await container.start()

            logger.info(f"[VM] Setting up container workspace directory")
            try:
                await self._exec_command(container, ["chown", "-R", "root:root", "/workspace"])
                await self._exec_command(container, ["chmod", "-R", "755", "/workspace"])
                logger.info(f"[VM] Container workspace directory setup completed")
            except Exception as dir_error:
                logger.error(f"[VM] Failed to setup workspace directory: {dir_error}")
                
            logger.info(f"[VM] Setting up development environment in container")
            try:
                await self._setup_container_environment(container, environment_type)
                logger.info(f"[VM] Development environment setup completed")
            except Exception as env_error:
                logger.error(f"[VM] ⚠️ Environment setup failed but container is still usable: {env_error}")

            self.active_containers[project_id] = container

            container_info = await container.show()
            assigned_ports = {}
            
            if "NetworkSettings" in container_info and "Ports" in container_info["NetworkSettings"]:
                ports = container_info["NetworkSettings"]["Ports"]
                for container_port, host_bindings in ports.items():
                    if host_bindings:
                        assigned_ports[container_port] = int(host_bindings[0]["HostPort"])

            container_id = container_info["Id"]
            container_status = container_info["State"]["Status"]
            
            logger.info(
                f"[VM] ✅ Docker container successfully created: {container_id[:12]} "
                f"for project {project_id}"
            )
            logger.info(f"[VM] Container ports: {assigned_ports}")
            logger.info(f"[VM] Workspace path: /workspace")
            logger.info(f"[VM] Container name: {container_name}")
            logger.info(f"[VM] Container status: {container_status}")
            
            return ContainerInfo(
                container_id=container_id,
                status=container_status,
                workspace_path="/workspace",
                environment_type=environment_type,
                ports=assigned_ports,
                created_at=datetime.now().isoformat()
            )

        except Exception as e:
            logger.error(
                f"[VM] ❌ Failed to create Docker container for project {project_id}: {e}"
            )
            logger.error(f"[VM] Container creation error details: {str(e)}")
            try:
                cleanup_container = await docker.containers.get(container_name)
                await cleanup_container.delete(force=True)
            except Exception:
                pass
            raise

    async def _setup_container_environment(
        self,
        container: DockerContainer,
        environment_type: str
    ) -> None:
        """Set up development environment in the container"""
        logger.info(f"[VM] Setting up {environment_type} environment in container {container.id[:12]}")

        setup_commands = {
            "minimal": [
                "apt-get update -qq",
                "apt-get install -y python3 python3-pip vim nano",
                "apt-get clean",
                "rm -rf /var/lib/apt/lists/*"
            ],
            "python": [
                "apt-get update -qq",
                "apt-get install -y python3 python3-pip python3-venv",
                "pip3 install --upgrade pip",
                "apt-get clean",
                "rm -rf /var/lib/apt/lists/*"
            ],
            "nodejs": [
                "echo 'Node.js and npm already available in base image'"
            ],
            "full": [
                "apt-get update -qq",
                "apt-get install -y python3 python3-pip python3-venv build-essential",
                "pip3 install --upgrade pip",
                "apt-get clean",
                "rm -rf /var/lib/apt/lists/*"
            ]
        }

        commands = setup_commands.get(environment_type, setup_commands["minimal"])

        failed_commands = []
        
        for i, command in enumerate(commands, 1):
            try:
                logger.info(f"[VM] Running setup command {i}/{len(commands)}: {command[:50]}...")
                
                result = await self._exec_command(
                    container, ["sh", "-c", command], 
                    user="root"
                )
                
                if result.exit_code != 0:
                    logger.warning(
                        f"[VM] Setup command failed (exit {result.exit_code}): {command[:50]}..."
                    )
                    error_output = result.output.decode()[:500] if result.output else "No output"
                    logger.warning(f"[VM] Error output: {error_output}")
                    failed_commands.append(command)
                else:
                    logger.info(f"[VM] ✅ Setup command {i} succeeded")
            except Exception as e:
                logger.error(f"[VM] Failed to run setup command '{command[:50]}...': {e}")
                failed_commands.append(command)
        
        if failed_commands:
            logger.info(f"[VM] Some setup commands failed but container should still be functional")
            logger.info(f"[VM] Failed commands: {failed_commands}")

        logger.info(f"[VM] ✅ Container environment setup completed for {environment_type}")

    async def start_container(self, project_id: str) -> bool:
        """Start an existing container"""
        docker = await self._get_docker_client()
        
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                await container.start()
                logger.info(f"[VM] ✅ Started existing container for project {project_id}")
                return True
            else:
                container_name = f"chatsparty-project-{project_id}"
                try:
                    container = await docker.containers.get(container_name)
                    await container.start()
                    self.active_containers[project_id] = container
                    logger.info(f"[VM] ✅ Found and started existing container for project {project_id}")
                    return True
                except aiodocker.DockerError as e:
                    if e.status == 404:
                        logger.warning(f"[VM] ⚠️ No container found for project {project_id}")
                    else:
                        logger.error(f"[VM] ❌ Error starting container: {e}")
                    return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to start container for project {project_id}: {e}")
            return False

    async def stop_container(self, project_id: str) -> bool:
        """Stop a running container"""
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                await asyncio.wait_for(container.stop(), timeout=10.0)
                logger.info(f"[VM] ✅ Stopped container for project {project_id}")
                return True
            return False
        except asyncio.TimeoutError:
            logger.warning(f"[VM] ⚠️ Timeout stopping container for project {project_id}")
            return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to stop container for project {project_id}: {e}")
            return False

    async def destroy_container(self, project_id: str) -> bool:
        """Destroy a container and clean up resources"""
        docker = await self._get_docker_client()
        container_found = False
        
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                await container.delete(force=True)
                del self.active_containers[project_id]
                container_found = True
            
            container_name = f"chatsparty-project-{project_id}"
            try:
                container = await docker.containers.get(container_name)
                await container.delete(force=True)
                container_found = True
            except aiodocker.DockerError as e:
                if e.status != 404:
                    logger.warning(f"[VM] Error removing container by name: {e}")
            
            if container_found:
                logger.info(f"[VM] ✅ Destroyed container for project {project_id}")
            else:
                logger.info(f"[VM] ℹ️ No container found for project {project_id} (already cleaned up)")
                
            return True
            
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to destroy container for project {project_id}: {e}")
            return False

    async def is_container_active(self, project_id: str) -> bool:
        """Check if container is active for project"""
        try:
            container = await self.get_container(project_id)
            if container:
                container_info = await asyncio.wait_for(
                    container.show(),
                    timeout=5.0
                )
                return container_info["State"]["Status"] == 'running'
            return False
        except asyncio.TimeoutError:
            logger.warning(f"[VM] ⚠️ Timeout checking container status for project {project_id}")
            return False
        except Exception as e:
            logger.warning(f"[VM] ⚠️ Failed to check container status for project {project_id}: {e}")
            return False

    async def get_container_info(
        self,
        project_id: str
    ) -> Optional[ContainerSystemInfo]:
        """Get information about the project's container"""
        if project_id not in self.active_containers:
            return None

        container = self.active_containers[project_id]

        try:
            cpu_result = await asyncio.wait_for(
                self._exec_command(container, ["nproc"]),
                timeout=5.0
            )
            memory_result = await asyncio.wait_for(
                self._exec_command(container, ["free", "-h"]),
                timeout=5.0
            )
            disk_result = await asyncio.wait_for(
                self._exec_command(container, ["df", "-h", "/"]),
                timeout=5.0
            )
            uptime_result = await asyncio.wait_for(
                self._exec_command(container, ["uptime"]),
                timeout=5.0
            )
            
            container_info = await container.show()

            return ContainerSystemInfo(
                container_id=container_info["Id"][:12],
                hostname=container_info["Name"].lstrip("/"),
                cpu_cores=(
                    cpu_result.output.decode().strip()
                    if cpu_result.exit_code == 0
                    else "unknown"
                ),
                memory_info=(
                    memory_result.output.decode().strip()
                    if memory_result.exit_code == 0
                    else "unknown"
                ),
                disk_info=(
                    disk_result.output.decode().strip()
                    if disk_result.exit_code == 0
                    else "unknown"
                ),
                uptime=(
                    uptime_result.output.decode().strip()
                    if uptime_result.exit_code == 0
                    else "unknown"
                ),
                workspace_path="/workspace"
            )

        except Exception as e:
            logger.error(f"Failed to get container info: {e}")
            return None

    async def cleanup_container(self, project_id: str) -> bool:
        """Clean up and remove container"""
        return await self.destroy_container(project_id)

    async def get_container(self, project_id: str) -> Optional[DockerContainer]:
        """Get the container instance for a project"""
        if project_id in self.active_containers:
            return self.active_containers[project_id]
        
        docker = await self._get_docker_client()
        
        try:
            container_name = f"chatsparty-project-{project_id}"
            
            container = await asyncio.wait_for(
                docker.containers.get(container_name),
                timeout=5.0
            )
            
            container_info = await container.show()
            container_status = container_info["State"]["Status"]
            
            if container_status == 'running':
                self.active_containers[project_id] = container
                logger.info(f"[VM] ✅ Found and reconnected to existing container for project {project_id}")
                return container
            else:
                logger.warning(f"[VM] ⚠️ Found container for project {project_id} but it's not running (status: {container_status})")
                return None
                
        except aiodocker.DockerError as e:
            if e.status == 404:
                logger.debug(f"[VM] No container found for project {project_id}")
            else:
                logger.error(f"[VM] ❌ Docker error looking up container for project {project_id}: {e}")
            return None
        except asyncio.TimeoutError:
            logger.warning(f"[VM] ⚠️ Timeout getting container for project {project_id}")
            return None
        except Exception as e:
            logger.error(f"[VM] ❌ Error looking up container for project {project_id}: {e}")
            return None