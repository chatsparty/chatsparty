import asyncio
import logging
from typing import Dict

import aiodocker

from .container_config import ContainerConfig

logger = logging.getLogger(__name__)


class PortManager:
    """Handle dynamic port exposure for containers"""
    
    def __init__(self, docker_client: aiodocker.Docker, active_containers: dict, config: ContainerConfig):
        self.docker_client = docker_client
        self.active_containers = active_containers
        self.config = config
    
    async def ensure_port_exposed(self, project_id: str, container_port: int) -> bool:
        """Dynamically expose a port by recreating the container with additional port binding"""
        try:
            return await asyncio.wait_for(
                self._ensure_port_exposed_impl(project_id, container_port),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error(f"[VM] ❌ Timeout exposing port {container_port} for project {project_id}")
            return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to expose port {container_port} for project {project_id}: {e}")
            return False

    async def _ensure_port_exposed_impl(self, project_id: str, container_port: int) -> bool:
        """Implementation of port exposure with safety checks"""
        try:
            if project_id not in self.active_containers:
                logger.error(f"[VM] Cannot expose port {container_port}: no container for project {project_id}")
                return False
            
            container = self.active_containers[project_id]

            # Check if port is already exposed
            container_info = await container.show()
            existing_ports = container_info.get("NetworkSettings", {}).get("Ports", {})
            port_key = f"{container_port}/tcp"
            
            if port_key in existing_ports and existing_ports[port_key]:
                logger.info(f"[VM] Port {container_port} already exposed for project {project_id}")
                return True

            logger.info(f"[VM] 🔄 Exposing new port {container_port} for project {project_id}")
            
            # Get current container configuration
            current_port_bindings = container_info.get("HostConfig", {}).get("PortBindings", {})
            container_config = self.config.get_container_config_with_port(
                project_id, container_port, current_port_bindings
            )
            
            # Stop and remove current container
            try:
                await asyncio.wait_for(container.stop(), timeout=15.0)
            except asyncio.TimeoutError:
                logger.warning(f"[VM] ⚠️ Graceful stop timeout, force killing container for project {project_id}")
                await asyncio.wait_for(container.kill(), timeout=5.0)
            
            await asyncio.wait_for(container.delete(), timeout=10.0)
            
            # Remove from active containers temporarily
            if project_id in self.active_containers:
                del self.active_containers[project_id]
            
            # Create new container with additional port
            container_name = self.config.get_container_name(project_id)
            
            new_container = await self.docker_client.containers.create(
                config=container_config,
                name=container_name
            )
            
            await new_container.start()
            self.active_containers[project_id] = new_container
            
            logger.info(f"[VM] ✅ Successfully exposed port {container_port} for project {project_id}")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"[VM] ❌ Timeout during container recreation for port {container_port}")
            return False
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to expose port {container_port} for project {project_id}: {e}")
            return False