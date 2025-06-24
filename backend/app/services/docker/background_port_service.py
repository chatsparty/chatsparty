"""
Background service for non-blocking port exposure in multi-tenant cloud environment
"""

import asyncio
import logging
from typing import Dict, Set, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


class PortExposureStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PortExposureTask:
    project_id: str
    port: int
    status: PortExposureStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class BackgroundPortService:
    """Non-blocking background service for port exposure operations"""
    
    def __init__(self):
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, Set[int]] = {}
        self.task_status: Dict[str, PortExposureTask] = {}
        self.worker_task: Optional[asyncio.Task] = None
        self.is_running = False
        
    def start_worker(self):
        """Start the background worker"""
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._worker_loop())
            logger.info("[PORT_SERVICE] 🚀 Background port exposure worker started")
    
    async def stop_worker(self):
        """Stop the background worker gracefully"""
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        logger.info("[PORT_SERVICE] 🛑 Background port exposure worker stopped")
    
    def queue_port_exposure(self, project_id: str, port: int) -> str:
        """
        Queue a port exposure task (non-blocking)
        Returns task_id for tracking
        """
        if project_id in self.active_tasks and port in self.active_tasks[project_id]:
            logger.debug(f"[PORT_SERVICE] Port {port} already queued for project {project_id}")
            return f"{project_id}:{port}"
        
        if project_id not in self.active_tasks:
            self.active_tasks[project_id] = set()
        self.active_tasks[project_id].add(port)
        
        task_id = f"{project_id}:{port}"
        task = PortExposureTask(
            project_id=project_id,
            port=port,
            status=PortExposureStatus.PENDING,
            created_at=datetime.utcnow()
        )
        self.task_status[task_id] = task
        
        try:
            self.task_queue.put_nowait(task)
            logger.info(f"[PORT_SERVICE] 📋 Queued port {port} exposure for project {project_id}")
        except asyncio.QueueFull:
            logger.warning(f"[PORT_SERVICE] ⚠️ Queue full, dropping port {port} exposure for project {project_id}")
            self._cleanup_task(task_id, PortExposureStatus.FAILED, "Queue full")
        
        return task_id
    
    def get_task_status(self, task_id: str) -> Optional[PortExposureTask]:
        """Get status of a port exposure task"""
        return self.task_status.get(task_id)
    
    def get_project_pending_ports(self, project_id: str) -> Set[int]:
        """Get ports that are pending/in-progress for a project"""
        return self.active_tasks.get(project_id, set())
    
    async def _worker_loop(self):
        """Background worker loop"""
        logger.info("[PORT_SERVICE] 🔄 Worker loop started")
        
        while self.is_running:
            try:
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                await self._process_task(task)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"[PORT_SERVICE] ❌ Worker loop error: {e}")
                await asyncio.sleep(1)
    
    async def _process_task(self, task: PortExposureTask):
        """Process a single port exposure task"""
        task_id = f"{task.project_id}:{task.port}"
        
        try:
            logger.info(f"[PORT_SERVICE] 🔨 Processing port {task.port} for project {task.project_id}")
            
            task.status = PortExposureStatus.IN_PROGRESS
            
            from .implementations.container_manager import ContainerManager
            
            container_manager = ContainerManager()
            success = await container_manager._ensure_port_exposed_impl(task.project_id, task.port)
            
            if success:
                self._cleanup_task(task_id, PortExposureStatus.COMPLETED)
                logger.info(f"[PORT_SERVICE] ✅ Successfully exposed port {task.port} for project {task.project_id}")
            else:
                self._cleanup_task(task_id, PortExposureStatus.FAILED, "Container manager failed")
                logger.warning(f"[PORT_SERVICE] ⚠️ Failed to expose port {task.port} for project {task.project_id}")
                
        except Exception as e:
            error_msg = str(e)
            self._cleanup_task(task_id, PortExposureStatus.FAILED, error_msg)
            logger.error(f"[PORT_SERVICE] ❌ Error processing port {task.port} for project {task.project_id}: {error_msg}")
    
    def _cleanup_task(self, task_id: str, status: PortExposureStatus, error_message: str = None):
        """Clean up completed task"""
        if task_id in self.task_status:
            task = self.task_status[task_id]
            task.status = status
            task.completed_at = datetime.utcnow()
            task.error_message = error_message
            
            if task.project_id in self.active_tasks:
                self.active_tasks[task.project_id].discard(task.port)
                if not self.active_tasks[task.project_id]:
                    del self.active_tasks[task.project_id]


_background_port_service: Optional[BackgroundPortService] = None


def get_background_port_service() -> BackgroundPortService:
    """Get the global background port service instance"""
    global _background_port_service
    if _background_port_service is None:
        _background_port_service = BackgroundPortService()
        _background_port_service.start_worker()
    return _background_port_service


async def shutdown_background_port_service():
    """Shutdown the background port service"""
    global _background_port_service
    if _background_port_service:
        await _background_port_service.stop_worker()
        _background_port_service = None