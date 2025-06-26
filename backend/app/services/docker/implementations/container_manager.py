import asyncio
import logging
from typing import Dict, Optional

import aiodocker
from aiodocker.containers import DockerContainer

from ..domain.models import ContainerInfo, ContainerSystemInfo
from ..interfaces.container_manager import IContainerManager
from ....core.config import settings

from .container_operations import ContainerOperations
from .container_config import ContainerConfig
from .container_info import ContainerInfoHandler
from .docker_client import DockerClientManager
from .port_manager import PortManager

logger = logging.getLogger(__name__)


class ContainerManager(IContainerManager):
    """Simplified container management for Docker with pre-built images"""

    def __init__(self):
        self.docker_client_manager = DockerClientManager()
        self.active_containers: Dict[str, DockerContainer] = {}
        self.config = ContainerConfig(settings.docker_image)
        self.operations = ContainerOperations(None, self.active_containers)
        self.port_manager = PortManager(None, self.active_containers, self.config)
        
    async def _get_docker_client(self) -> aiodocker.Docker:
        """Get or create Docker client"""
        client = await self.docker_client_manager.get_client()
        self.operations.docker_client = client
        self.port_manager.docker_client = client
        return client

    async def close(self):
        """Close Docker client connection"""
        await self.docker_client_manager.close()

    async def create_project_container(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> ContainerInfo:
        """Create a new Docker container for a project"""
        docker = await self._get_docker_client()
        
        try:
            logger.info(f"[VM] Creating container for project {project_id}")

            if not await self.docker_client_manager.ensure_image_available():
                raise Exception(f"Pre-built Docker image '{self.config.base_image}' not available")

            container_name = self.config.get_container_name(project_id)

            await self._cleanup_existing_container(docker, container_name)

            self.config.setup_workspace()

            logger.info(f"[VM] Creating container with image: {self.config.base_image}")
            
            container_config = self.config.get_container_config(project_id)
            container = await docker.containers.create(
                config=container_config,
                name=container_name
            )
            
            await container.start()

            await self._setup_workspace_permissions(container)

            self.active_containers[project_id] = container

            container_info = await container.show()
            assigned_ports = ContainerInfoHandler.extract_port_mappings(container_info)
            
            logger.info(f"[VM] ✅ Container {container_info['Id'][:12]} created for project {project_id}")
            logger.info(f"[VM] Ports: {assigned_ports}")
            
            return ContainerInfoHandler.create_container_info(
                container_info, environment_type, assigned_ports
            )

        except Exception as e:
            logger.error(f"[VM] ❌ Failed to create container for project {project_id}: {e}")
            await self._cleanup_failed_container(docker, container_name)
            raise

    async def _cleanup_existing_container(self, docker: aiodocker.Docker, container_name: str):
        """Remove existing container if it exists"""
        try:
            existing_container = await docker.containers.get(container_name)
            logger.info(f"[VM] Found existing container {container_name}, removing it")
            await existing_container.delete(force=True)
        except aiodocker.DockerError as e:
            if e.status != 404:
                logger.warning(f"[VM] Failed to remove existing container: {e}")

    async def _setup_workspace_permissions(self, container: DockerContainer):
        """Setup workspace permissions"""
        try:
            await self.docker_client_manager.exec_command(
                container, ["chown", "-R", "codespace:codespace", "/workspace"], user="root"
            )
            logger.info(f"[VM] Workspace permissions set")
        except Exception as dir_error:
            logger.warning(f"[VM] Failed to set workspace permissions: {dir_error}")

    async def _cleanup_failed_container(self, docker: aiodocker.Docker, container_name: str):
        """Cleanup container after failed creation"""
        try:
            cleanup_container = await docker.containers.get(container_name)
            await cleanup_container.delete(force=True)
        except Exception:
            pass

    async def start_container(self, project_id: str) -> bool:
        """Start an existing container"""
        await self._get_docker_client()
        return await self.operations.start_container(project_id)

    async def stop_container(self, project_id: str) -> bool:
        """Stop a running container"""
        return await self.operations.stop_container(project_id)

    async def destroy_container(self, project_id: str) -> bool:
        """Destroy a container and clean up resources"""
        return await self.operations.destroy_container(project_id)

    async def is_container_active(self, project_id: str) -> bool:
        """Check if container is active for project"""
        return await self.operations.is_container_active(project_id)

    async def get_container_info(self, project_id: str) -> Optional[ContainerSystemInfo]:
        """Get basic container information"""
        if project_id not in self.active_containers:
            return None
        container = self.active_containers[project_id]
        return await ContainerInfoHandler.get_container_system_info(container, project_id)

    async def cleanup_container(self, project_id: str) -> bool:
        """Clean up and remove container"""
        return await self.destroy_container(project_id)

    async def get_container(self, project_id: str) -> Optional[DockerContainer]:
        """Get the container instance for a project"""
        await self._get_docker_client()
        return await self.operations.get_container(project_id)

    async def ensure_container_running(self, project_id: str) -> Optional[DockerContainer]:
        """Ensure container is running, start it if stopped"""
        await self._get_docker_client()
        return await self.operations.ensure_container_running(project_id)

    async def ensure_port_exposed(self, project_id: str, container_port: int) -> bool:
        """Dynamically expose a port by recreating the container"""
        await self._get_docker_client()
        return await self.port_manager.ensure_port_exposed(project_id, container_port)