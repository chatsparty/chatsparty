"""
Port monitoring service for automatic preview URL updates
"""
import asyncio
import logging
from typing import Dict, Optional, Set
from datetime import datetime, timedelta

from ..vm_factory import get_vm_service
from ..project.application.services import ProjectService
from .socketio_manager import socketio_manager

logger = logging.getLogger(__name__)


class PortMonitorService:
    """Service to monitor container ports and send updates via WebSocket"""
    
    def __init__(self):
        self.active_monitors: Dict[str, asyncio.Task] = {}
        self.last_port_state: Dict[str, Dict[int, Dict]] = {}
        self.monitor_interval = 5
        self.sio = socketio_manager.sio
        
    async def start_monitoring(self, project_id: str, user_id: str):
        """Start monitoring ports for a project"""
        if project_id in self.active_monitors:
            logger.info(f"Port monitoring already active for project {project_id}")
            return
            
        logger.info(f"Starting port monitoring for project {project_id}")
        
        await self.stop_monitoring(project_id)
        
        task = asyncio.create_task(self._monitor_project_ports(project_id, user_id))
        self.active_monitors[project_id] = task
        
    async def stop_monitoring(self, project_id: str):
        """Stop monitoring ports for a project"""
        if project_id in self.active_monitors:
            logger.info(f"Stopping port monitoring for project {project_id}")
            self.active_monitors[project_id].cancel()
            try:
                await self.active_monitors[project_id]
            except asyncio.CancelledError:
                pass
            del self.active_monitors[project_id]
            
        if project_id in self.last_port_state:
            del self.last_port_state[project_id]
            
    async def _monitor_project_ports(self, project_id: str, user_id: str):
        """Monitor ports for a specific project"""
        vm_service = get_vm_service()
        project_service = ProjectService()
        
        while True:
            try:
                active_ports = await vm_service.get_active_ports(project_id)
                
                if self._has_ports_changed(project_id, active_ports):
                    logger.info(f"Port change detected for project {project_id}")
                    
                    preview_url, preview_port = self._find_best_preview_port(active_ports)
                    
                    if preview_url:
                        project = project_service.get_project(project_id, user_id)
                        if project and project.vm_url != preview_url:
                            await project_service.update_project(
                                project_id,
                                user_id,
                                {"vm_url": preview_url}
                            )
                            logger.info(f"Updated preview URL for project {project_id}: {preview_url}")
                    
                    await self._send_port_update(project_id, active_ports, preview_url, preview_port)
                    
                    self.last_port_state[project_id] = active_ports
                    
                await asyncio.sleep(self.monitor_interval)
                
            except asyncio.CancelledError:
                logger.info(f"Port monitoring cancelled for project {project_id}")
                break
            except Exception as e:
                logger.error(f"Error monitoring ports for project {project_id}: {e}")
                await asyncio.sleep(self.monitor_interval)
                
    def _has_ports_changed(self, project_id: str, current_ports: Dict[int, Dict]) -> bool:
        """Check if ports have changed since last check"""
        if project_id not in self.last_port_state:
            return True
            
        last_ports = self.last_port_state[project_id]
        
        if set(last_ports.keys()) != set(current_ports.keys()):
            return True
            
        for port, details in current_ports.items():
            if port not in last_ports:
                return True
            if details.get("host_port") != last_ports[port].get("host_port"):
                return True
                
        return False
        
    def _find_best_preview_port(self, active_ports: Dict[int, Dict]) -> tuple[Optional[str], Optional[int]]:
        """Find the best port for preview based on common dev server ports"""
        common_ports = [3000, 8080, 5173, 4200, 5000, 8000]
        
        for port in common_ports:
            if port in active_ports and "url" in active_ports[port]:
                return active_ports[port]["url"], port
                
        if active_ports:
            first_port = list(active_ports.values())[0]
            if "url" in first_port:
                return first_port["url"], first_port["port"]
                
        return None, None
        
    async def _send_port_update(self, project_id: str, active_ports: Dict[int, Dict], 
                               preview_url: Optional[str], preview_port: Optional[int]):
        """Send port update via WebSocket"""
        try:
            event_data = {
                "project_id": project_id,
                "active_ports": active_ports,
                "preview_url": preview_url,
                "preview_port": preview_port,
                "timestamp": datetime.now().isoformat()
            }
            
            room = f"project_{project_id}"
            await self.sio.emit("port_update", event_data, room=room)
            logger.info(f"Sent port update for project {project_id} to room {room}")
            
        except Exception as e:
            logger.error(f"Error sending port update: {e}")


port_monitor_service = PortMonitorService()