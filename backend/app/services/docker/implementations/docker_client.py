import asyncio
import logging
from typing import Optional

import aiodocker
from aiodocker.containers import DockerContainer

from ....core.config import settings

logger = logging.getLogger(__name__)


class ExecResult:
    """Simple container for command execution results"""
    def __init__(self, output: bytes, exit_code: int):
        self.output = output
        self.exit_code = exit_code


class DockerClientManager:
    """Manage Docker client connection and image availability"""
    
    def __init__(self):
        self.docker_client: Optional[aiodocker.Docker] = None
        self.base_image = settings.docker_image
        self.mode = settings.docker_mode
    
    async def get_client(self) -> aiodocker.Docker:
        """Get or create Docker client"""
        if self.docker_client is None:
            try:
                self.docker_client = aiodocker.Docker()
                await self.docker_client.version()
                logger.info("Docker client connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Docker: {e}")
                raise
        return self.docker_client
    
    async def close(self):
        """Close Docker client connection"""
        if self.docker_client:
            await self.docker_client.close()
            self.docker_client = None
    
    async def ensure_image_available(self) -> bool:
        """Ensure the Docker image is available (local or cloud)"""
        docker = await self.get_client()
        
        try:
            # Check if image exists locally
            try:
                await docker.images.get(self.base_image)
                logger.info(f"[VM] Image {self.base_image} found locally")
                return True
            except aiodocker.DockerError as e:
                if e.status == 404:
                    logger.info(f"[VM] Image {self.base_image} not found locally")
                else:
                    logger.error(f"[VM] Error checking for local image: {e}")
                    return False
            
            # If not found locally, try to pull based on mode
            if self.mode == "cloud":
                logger.info(f"[VM] Attempting to pull image {self.base_image} from cloud")
                try:
                    await docker.images.pull(self.base_image)
                    logger.info(f"[VM] ✅ Successfully pulled image {self.base_image} from cloud")
                    return True
                except Exception as pull_error:
                    logger.error(f"[VM] ❌ Failed to pull image from cloud: {pull_error}")
                    return False
            else:
                logger.error(f"[VM] ❌ Image {self.base_image} not found locally and mode is '{self.mode}'")
                return False
            
        except Exception as e:
            logger.error(f"[VM] ❌ Failed to ensure image availability: {e}")
            return False
    
    async def exec_command(self, container: DockerContainer, cmd: list, **kwargs) -> ExecResult:
        """Execute command in container"""
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
            
            return ExecResult(output_bytes, exit_code)
        except Exception as e:
            logger.error(f"Error executing command {cmd}: {e}")
            return ExecResult(b"", 1)