import logging
from typing import Optional, Dict, Any
from datetime import datetime

from aiodocker.containers import DockerContainer
from ..domain.models import ContainerInfo, ContainerSystemInfo

logger = logging.getLogger(__name__)


class ContainerInfoHandler:
    """Handle container information and status"""
    
    @staticmethod
    def create_container_info(
        container_info: Dict[str, Any],
        environment_type: str,
        assigned_ports: Dict[str, int]
    ) -> ContainerInfo:
        """Create ContainerInfo from Docker container info"""
        container_id = container_info["Id"]
        container_status = container_info["State"]["Status"]
        
        return ContainerInfo(
            container_id=container_id,
            status=container_status,
            workspace_path="/workspace",
            environment_type=environment_type,
            ports=assigned_ports,
            created_at=datetime.now().isoformat()
        )
    
    @staticmethod
    def extract_port_mappings(container_info: Dict[str, Any]) -> Dict[str, int]:
        """Extract port mappings from container info"""
        assigned_ports = {}
        
        if "NetworkSettings" in container_info and "Ports" in container_info["NetworkSettings"]:
            ports = container_info["NetworkSettings"]["Ports"]
            for container_port, host_bindings in ports.items():
                if host_bindings:
                    assigned_ports[container_port] = int(host_bindings[0]["HostPort"])
        
        return assigned_ports
    
    @staticmethod
    async def get_container_system_info(
        container: DockerContainer,
        project_id: str
    ) -> Optional[ContainerSystemInfo]:
        """Get basic container system information"""
        try:
            container_info = await container.show()
            return ContainerSystemInfo(
                container_id=container_info["Id"][:12],
                hostname=container_info["Name"].lstrip("/"),
                cpu_cores="2",  # Default from container config
                memory_info="2GB",  # Default from container config
                disk_info="Available",
                uptime="Running",
                workspace_path="/workspace"
            )
        except Exception as e:
            logger.error(f"Failed to get container info for {project_id}: {e}")
            return None