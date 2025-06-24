"""
Project monitoring and status router
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...models.database import User
from ...services.project.application.services import ProjectService
from ...services.vm_factory import get_vm_service
from ..auth import get_current_user_dependency
from .base import get_project_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-monitoring"])


class StopServiceRequest(BaseModel):
    port: int


@router.get("/{project_id}/status")
async def get_project_status(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get project status"""
    try:
        logger.info(f"Getting status for project {project_id}, user {current_user.id}")
        
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            logger.warning(f"Project {project_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"Project {project_id} found, getting status")
        
        status = await project_service.get_project_status(project_id)
        
        return {
            "status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project status for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/services")
async def get_project_services(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get all services for a project"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        services = await project_service.get_project_services(project_id)
        
        return {
            "services": [
                {
                    "id": service.id,
                    "service_name": service.service_name,
                    "service_type": service.service_type,
                    "command": service.command,
                    "port": service.port,
                    "status": service.status,
                    "process_id": service.process_id,
                    "service_url": service.service_url,
                    "auto_start": service.auto_start,
                    "restart_policy": service.restart_policy,
                    "created_at": service.created_at.isoformat() if service.created_at else None,
                    "last_started_at": service.last_started_at.isoformat() if service.last_started_at else None
                }
                for service in services
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project services for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/active-services")
async def get_active_services(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get all active services discovered through port scanning"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.vm_status != 'active':
            return {"active_services": []}
        
        vm_service = get_vm_service()
        active_ports = await vm_service.get_active_ports(project_id)
        
        from ...services.docker.background_port_service import get_background_port_service
        port_service = get_background_port_service()
        pending_ports = port_service.get_project_pending_ports(project_id)
        
        services = []
        for port, details in active_ports.items():
            port_status = "running"
            if port in pending_ports:
                task_id = f"{project_id}:{port}"
                task = port_service.get_task_status(task_id)
                if task:
                    if task.status.value == "pending":
                        port_status = "exposing"
                    elif task.status.value == "in_progress":
                        port_status = "exposing"
                    elif task.status.value == "failed":
                        port_status = "exposure_failed"
            
            services.append({
                "id": f"port_{port}",
                "service_name": details.get("service_name", f"{details.get('process', 'unknown')}:{port}"),
                "port": port,
                "status": port_status,
                "process_id": details.get("process_id"),
                "process_name": details.get("process", "unknown"),
                "service_url": details.get("url"),
                "host_port": details.get("host_port"),
                "address": details.get("address"),
                "is_discovered": True,
                "exposure_status": task.status.value if port in pending_ports and port_service.get_task_status(f"{project_id}:{port}") else "completed"
            })
        
        return {"active_services": services}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get active services for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/port-exposure-status")
async def get_port_exposure_status(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Get status of background port exposure tasks"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        from ...services.docker.background_port_service import get_background_port_service
        port_service = get_background_port_service()
        
        pending_ports = port_service.get_project_pending_ports(project_id)
        
        task_statuses = []
        for port in pending_ports:
            task_id = f"{project_id}:{port}"
            task = port_service.get_task_status(task_id)
            if task:
                task_statuses.append({
                    "port": port,
                    "status": task.status.value,
                    "created_at": task.created_at.isoformat(),
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    "error_message": task.error_message
                })
        
        return {
            "project_id": project_id,
            "pending_ports": list(pending_ports),
            "task_statuses": task_statuses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get port exposure status for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/services/stop")
async def stop_service_by_port(
    project_id: str,
    request: StopServiceRequest,
    current_user: User = Depends(get_current_user_dependency),
    project_service: ProjectService = Depends(get_project_service)
) -> Dict:
    """Stop a service by killing the process on the specified port"""
    try:
        project = project_service.get_project(project_id, current_user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.vm_status != 'active':
            raise HTTPException(status_code=400, detail="VM is not active")
        
        vm_service = get_vm_service()
        success = await vm_service.kill_process_by_port(project_id, request.port)
        
        if success:
            logger.info(f"Successfully stopped service on port {request.port} for project {project_id}")
            return {
                "success": True,
                "message": f"Service on port {request.port} stopped successfully",
                "port": request.port
            }
        else:
            logger.warning(f"Failed to stop service on port {request.port} for project {project_id}")
            return {
                "success": False,
                "message": f"Failed to stop service on port {request.port}",
                "port": request.port
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop service on port {request.port} for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))