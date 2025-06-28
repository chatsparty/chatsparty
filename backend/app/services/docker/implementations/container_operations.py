import asyncio
import logging
from typing import Optional

import aiodocker
from aiodocker.containers import DockerContainer

logger = logging.getLogger(__name__)


class ContainerOperations:
    """Handle basic container lifecycle operations"""
    
    def __init__(self, docker_client: aiodocker.Docker, active_containers: dict):
        self.docker_client = docker_client
        self.active_containers = active_containers
    
    async def start_container(self, project_id: str) -> bool:
        """Start an existing container"""
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                await container.start()
                logger.info(f"[VM] ✅ Started existing container for project {project_id}")
                return True
            else:
                container_name = f"chatsparty-project-{project_id}"
                try:
                    container = await self.docker_client.containers.get(container_name)
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
        container_found = False
        
        try:
            if project_id in self.active_containers:
                container = self.active_containers[project_id]
                await container.delete(force=True)
                del self.active_containers[project_id]
                container_found = True
            
            container_name = f"chatsparty-project-{project_id}"
            try:
                container = await self.docker_client.containers.get(container_name)
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

    async def get_container(self, project_id: str) -> Optional[DockerContainer]:
        """Get the container instance for a project"""
        if project_id in self.active_containers:
            return self.active_containers[project_id]
        
        try:
            container_name = f"chatsparty-project-{project_id}"
            
            container = await asyncio.wait_for(
                self.docker_client.containers.get(container_name),
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
                self.active_containers[project_id] = container
                return container
                
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

    async def ensure_container_running(self, project_id: str) -> Optional[DockerContainer]:
        """Ensure container is running, start it if stopped"""
        container = await self.get_container(project_id)
        if not container:
            logger.warning(f"[VM] No container found for project {project_id}")
            return None
        
        try:
            container_info = await container.show()
            container_status = container_info["State"]["Status"]
            
            if container_status == 'running':
                return container
            elif container_status in ['exited', 'stopped']:
                logger.info(f"[VM] Container for project {project_id} is {container_status}, starting it...")
                await container.start()
                
                await asyncio.sleep(1)
                container_info = await container.show()
                new_status = container_info["State"]["Status"]
                
                if new_status == 'running':
                    logger.info(f"[VM] ✅ Successfully started container for project {project_id}")
                    return container
                else:
                    logger.error(f"[VM] ❌ Failed to start container for project {project_id}, status: {new_status}")
                    return None
            else:
                logger.warning(f"[VM] Container for project {project_id} has unexpected status: {container_status}")
                return None
                
        except Exception as e:
            logger.error(f"[VM] ❌ Error ensuring container is running for project {project_id}: {e}")
            return None