import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Optional

import docker
from docker.models.containers import Container

from ..domain.models import ContainerInfo, ContainerSystemInfo
from ..interfaces.container_manager import IContainerManager

logger = logging.getLogger(__name__)


class ContainerManager(IContainerManager):
    """Implementation of container management for Docker"""

    def __init__(self):
        try:
            self.client = docker.from_env()
            # Test Docker connection
            self.client.ping()
            logger.info("Docker client connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Docker: {e}")
            raise

        self.active_containers: Dict[str, Container] = {}
        self.base_image = "ubuntu:22.04"
        # Thread pool for blocking Docker operations
        self.executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="docker-")

    async def create_project_container(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> ContainerInfo:
        """Create a new Docker container for a project"""
        try:
            logger.info(f"[VM] Starting container creation process for project {project_id}")
            logger.info(f"[VM] Environment type: {environment_type}, Template: {template_id}")

            # Container configuration
            container_name = f"chatsparty-project-{project_id}"
            logger.info(f"[VM] Container name: {container_name}")

            # Check if container already exists and remove it
            try:
                existing_container = self.client.containers.get(container_name)
                logger.info(f"[VM] Found existing container {container_name}, removing it first")
                existing_container.remove(force=True)
                logger.info(f"[VM] Existing container removed successfully")
            except docker.errors.NotFound:
                logger.info(f"[VM] No existing container found with name {container_name}")
            except Exception as e:
                logger.warning(f"[VM] Failed to remove existing container: {e}")

            # Create workspace directory on host
            workspace_path = f"/tmp/chatsparty/projects/{project_id}"
            logger.info(f"[VM] Creating workspace directory: {workspace_path}")
            os.makedirs(workspace_path, exist_ok=True)
            logger.info(f"[VM] Workspace directory created successfully")

            logger.info(f"[VM] Base image: {self.base_image}")
            
            # Create and start container (in thread pool to avoid blocking)
            logger.info(f"[VM] Starting container with Docker API...")
            
            def _create_container():
                return self.client.containers.run(
                    image=self.base_image,
                    command="tail -f /dev/null",  # Keep container alive
                    detach=True,
                    name=container_name,
                    volumes={
                        workspace_path: {
                            "bind": "/workspace",
                            "mode": "rw"
                        }
                    },
                    working_dir="/workspace",
                    ports={
                        '3000/tcp': None,  # React dev server
                        '8000/tcp': None,  # Django/FastAPI
                        '5000/tcp': None,  # Flask
                        '8080/tcp': None,  # Generic web server
                    },
                    environment={
                        'PROJECT_ID': project_id,
                        'DEBIAN_FRONTEND': 'noninteractive',
                        'HOME': '/workspace'
                    },
                    user="root",  # Allow full system access
                    # Security settings
                    mem_limit="2g",
                    cpu_quota=100000,  # 1 CPU core
                    security_opt=["seccomp:unconfined"],  # Allow system calls
                )
            
            # Run container creation in thread pool
            loop = asyncio.get_event_loop()
            container = await loop.run_in_executor(self.executor, _create_container)

            # Setup development environment
            logger.info(f"[VM] Setting up development environment in container")
            try:
                await self._setup_container_environment(container, environment_type)
                logger.info(f"[VM] Development environment setup completed")
            except Exception as env_error:
                logger.error(f"[VM] ⚠️ Environment setup failed but container is still usable: {env_error}")
                # Don't raise the exception - container is still created and usable

            # Store container reference
            self.active_containers[project_id] = container

            # Get assigned ports
            container.reload()
            assigned_ports = {}
            for port, bindings in (container.ports or {}).items():
                if bindings:
                    assigned_ports[port] = int(bindings[0]['HostPort'])

            logger.info(
                f"[VM] ✅ Docker container successfully created: {container.id[:12]} "
                f"for project {project_id}"
            )
            logger.info(f"[VM] Container ports: {assigned_ports}")
            logger.info(f"[VM] Workspace path: /workspace")
            logger.info(f"[VM] Container name: {container_name}")
            logger.info(f"[VM] Container status: {container.status}")

            # Verify container is actually running
            container.reload()
            actual_status = container.status
            logger.info(f"[VM] Container actual status after creation: {actual_status}")
            
            return ContainerInfo(
                container_id=container.id,
                status=actual_status,
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
            # Clean up if container was partially created
            try:
                container = self.client.containers.get(container_name)
                container.remove(force=True)
            except Exception:
                pass
            raise

    async def _setup_container_environment(
        self,
        container: Container,
        environment_type: str
    ) -> None:
        """Set up development environment in the container"""
        logger.info(f"[VM] Setting up {environment_type} environment in container {container.id[:12]}")

        setup_commands = {
            "python": [
                "apt-get update -qq",
                "apt-get install -y python3 python3-pip python3-venv git curl wget nano vim",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib requests flask fastapi uvicorn"
            ],
            "nodejs": [
                "apt-get update -qq",
                "apt-get install -y ca-certificates curl gnupg",
                "mkdir -p /etc/apt/keyrings",
                "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o /tmp/nodesource.key",
                "gpg --dearmor < /tmp/nodesource.key > /etc/apt/keyrings/nodesource.gpg",
                "echo \"deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main\" | tee /etc/apt/sources.list.d/nodesource.list",
                "apt-get update -qq",
                "apt-get install -y nodejs git wget nano vim",
                "npm install -g typescript ts-node nodemon create-react-app @vue/cli"
            ],
            "full": [
                "apt-get update -qq",
                "apt-get install -y python3 python3-pip git curl wget nano vim build-essential ca-certificates gnupg",
                "mkdir -p /etc/apt/keyrings",
                "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o /tmp/nodesource.key",
                "gpg --dearmor < /tmp/nodesource.key > /etc/apt/keyrings/nodesource.gpg",
                "echo \"deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main\" | tee /etc/apt/sources.list.d/nodesource.list",
                "apt-get update -qq",
                "apt-get install -y nodejs sqlite3 postgresql-client redis-tools",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib requests flask fastapi uvicorn django",
                "npm install -g typescript ts-node nodemon create-react-app @vue/cli",
                "apt-get clean && rm -rf /var/lib/apt/lists/*"
            ]
        }

        commands = setup_commands.get(environment_type, setup_commands["full"])

        failed_commands = []
        
        for i, command in enumerate(commands, 1):
            try:
                logger.info(f"[VM] Running setup command {i}/{len(commands)}: {command[:50]}...")
                
                # Run exec_run in thread pool to avoid blocking
                def _exec_command():
                    return container.exec_run(command, user="root")
                
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(self.executor, _exec_command)
                
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
        
        # Try fallback for Node.js if the complex setup failed
        if any("nodesource" in cmd for cmd in failed_commands):
            logger.info(f"[VM] 🔄 Attempting fallback Node.js installation...")
            try:
                def _fallback_exec():
                    return container.exec_run("apt-get install -y nodejs npm", user="root")
                
                loop = asyncio.get_event_loop()
                fallback_result = await loop.run_in_executor(self.executor, _fallback_exec)
                
                if fallback_result.exit_code == 0:
                    logger.info(f"[VM] ✅ Fallback Node.js installation succeeded")
                else:
                    logger.warning(f"[VM] ⚠️ Fallback Node.js installation also failed")
            except Exception as e:
                logger.error(f"[VM] Failed fallback Node.js installation: {e}")

        logger.info(f"[VM] ✅ Container environment setup completed for {environment_type}")

    async def start_container(self, project_id: str) -> bool:
        """Start an existing container"""
        try:
            if project_id in self.active_containers:
                def _start_existing():
                    container = self.active_containers[project_id]
                    container.start()
                    return True
                
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(self.executor, _start_existing)
                logger.info(f"[VM] ✅ Started existing container for project {project_id}")
                return True
            else:
                # Try to find existing container by name
                container_name = f"chatsparty-project-{project_id}"
                def _find_and_start():
                    try:
                        container = self.client.containers.get(container_name)
                        container.start()
                        self.active_containers[project_id] = container
                        return True
                    except docker.errors.NotFound:
                        return False
                
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(self.executor, _find_and_start)
                
                if result:
                    logger.info(f"[VM] ✅ Found and started existing container for project {project_id}")
                    return True
                else:
                    logger.warning(f"[VM] ⚠️ No container found for project {project_id}")
                    return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to start container for project {project_id}: {e}")
            return False

    async def stop_container(self, project_id: str) -> bool:
        """Stop a running container"""
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                container.stop()
                logger.info(f"[VM] ✅ Stopped container for project {project_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to stop container for project {project_id}: {e}")
            return False

    async def destroy_container(self, project_id: str) -> bool:
        """Destroy a container and clean up resources"""
        try:
            def _destroy_containers():
                container_found = False
                
                # First check active containers
                if project_id in self.active_containers:
                    container = self.active_containers[project_id]
                    container.remove(force=True)
                    del self.active_containers[project_id]
                    container_found = True
                
                # Also try to find and remove by name (in case it's not in active_containers)
                container_name = f"chatsparty-project-{project_id}"
                try:
                    container = self.client.containers.get(container_name)
                    container.remove(force=True)
                    container_found = True
                except docker.errors.NotFound:
                    pass
                
                return container_found
            
            loop = asyncio.get_event_loop()
            container_found = await loop.run_in_executor(self.executor, _destroy_containers)
            
            if container_found:
                logger.info(f"[VM] ✅ Destroyed container for project {project_id}")
            else:
                logger.info(f"[VM] ℹ️ No container found for project {project_id} (already cleaned up)")
                
            return True  # Return True even if no container found (cleanup is successful)
            
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to destroy container for project {project_id}: {e}")
            return False

    def is_container_active(self, project_id: str) -> bool:
        """Check if container is active for project"""
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                container.reload()
                return container.status == 'running'
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
            # Get system information
            cpu_result = container.exec_run("nproc")
            memory_result = container.exec_run("free -h")
            disk_result = container.exec_run("df -h /")
            uptime_result = container.exec_run("uptime")

            return ContainerSystemInfo(
                container_id=container.id[:12],
                hostname=container.name,
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

    def get_container(self, project_id: str) -> Optional[Container]:
        """Get the container instance for a project"""
        return self.active_containers.get(project_id)