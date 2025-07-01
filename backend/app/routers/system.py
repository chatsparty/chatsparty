"""
System configuration router
"""

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.config import settings

router = APIRouter(prefix="/api/system", tags=["system"])


class SystemConfigResponse(BaseModel):
    """System configuration response"""
    vm_workspace_enabled: bool
    enable_projects: bool


@router.get("/config", response_model=SystemConfigResponse)
async def get_system_config():
    """Get system configuration including feature flags"""
    return SystemConfigResponse(
        vm_workspace_enabled=settings.vm_workspace_enabled,
        enable_projects=settings.enable_projects
    )