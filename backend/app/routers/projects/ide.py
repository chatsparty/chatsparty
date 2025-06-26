"""
IDE Management endpoints for projects
Handles VS Code, Theia, and other web-based IDE servers
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field

from ...services.vm_factory import get_vm_service
from ...services.vm.interfaces.vm_provider import VMProviderInterface

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["ide"])


class IDESetupRequest(BaseModel):
    """Request model for setting up IDE server"""
    ide_type: str = Field(default="vscode", description="Type of IDE (vscode, theia)")
    port: Optional[int] = Field(default=8080, description="Port to run IDE server on")


class IDESetupResponse(BaseModel):
    """Response model for IDE setup"""
    success: bool
    ide: Dict[str, Any]
    message: Optional[str] = None


class IDEStatusResponse(BaseModel):
    """Response model for IDE status"""
    running: bool
    ide_type: Optional[str] = None
    url: Optional[str] = None
    port: Optional[int] = None
    status: str
    error: Optional[str] = None


@router.post("/{project_id}/ide/setup", response_model=IDESetupResponse)
async def setup_ide_server(
    project_id: str,
    setup_request: IDESetupRequest = Body(...),
    vm_service: VMProviderInterface = Depends(get_vm_service)
):
    """
    Setup and start an IDE server (VS Code, Theia, etc.) for a project
    
    This endpoint will:
    1. Check if the project container is running
    2. Install the requested IDE server if not already present
    3. Start the IDE server with proper configuration
    4. Return connection information
    """
    try:
        logger.info(f"Setting up {setup_request.ide_type} IDE for project {project_id}")
        
        # Check if project sandbox is active
        if not await vm_service.is_sandbox_active(project_id):
            raise HTTPException(
                status_code=400,
                detail="Project container is not active. Please start the project first."
            )
        
        # Setup IDE server
        ide_info = await vm_service.setup_ide_server(
            project_id=project_id,
            ide_type=setup_request.ide_type,
            port=setup_request.port or 8080
        )
        
        logger.info(f"IDE setup completed for project {project_id}: {ide_info}")
        
        return IDESetupResponse(
            success=True,
            ide=ide_info,
            message=f"{setup_request.ide_type.title()} server started successfully"
        )
        
    except ValueError as e:
        logger.error(f"Validation error setting up IDE for project {project_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except RuntimeError as e:
        logger.error(f"Runtime error setting up IDE for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to setup IDE server: {str(e)}")
    
    except Exception as e:
        logger.error(f"Unexpected error setting up IDE for project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while setting up the IDE server"
        )


@router.get("/{project_id}/ide/status", response_model=IDEStatusResponse)
async def get_ide_status(
    project_id: str,
    vm_service: VMProviderInterface = Depends(get_vm_service)
):
    """
    Get the current status of IDE servers for a project
    
    Returns information about running IDE servers including:
    - IDE type (vscode, theia, etc.)
    - Connection URL
    - Port information
    - Running status
    """
    try:
        logger.info(f"Getting IDE status for project {project_id}")
        
        # Check if project sandbox is active
        if not await vm_service.is_sandbox_active(project_id):
            return IDEStatusResponse(
                running=False,
                status="container_not_active",
                error="Project container is not active"
            )
        
        # Get IDE status
        ide_status = await vm_service.get_ide_status(project_id)
        
        if ide_status.get("status") == "not_running":
            return IDEStatusResponse(
                running=False,
                status="not_running"
            )
        elif ide_status.get("status") == "error":
            return IDEStatusResponse(
                running=False,
                status="error",
                error=ide_status.get("error", "Unknown error")
            )
        elif ide_status.get("status") == "not_implemented":
            return IDEStatusResponse(
                running=False,
                status="not_implemented",
                error=ide_status.get("message", "IDE not implemented for this provider")
            )
        else:
            return IDEStatusResponse(
                running=True,
                ide_type=ide_status.get("ide_type"),
                url=ide_status.get("url"),
                port=ide_status.get("port"),
                status="running"
            )
        
    except Exception as e:
        logger.error(f"Error getting IDE status for project {project_id}: {str(e)}")
        return IDEStatusResponse(
            running=False,
            status="error",
            error=str(e)
        )


@router.post("/{project_id}/ide/stop")
async def stop_ide_server(
    project_id: str,
    vm_service: VMProviderInterface = Depends(get_vm_service)
):
    """
    Stop the IDE server for a project
    
    This will terminate any running IDE servers (VS Code, Theia, etc.)
    and free up the associated resources.
    """
    try:
        logger.info(f"Stopping IDE server for project {project_id}")
        
        # Check if project sandbox is active
        if not await vm_service.is_sandbox_active(project_id):
            raise HTTPException(
                status_code=400,
                detail="Project container is not active"
            )
        
        # Stop IDE server
        success = await vm_service.stop_ide_server(project_id)
        
        if success:
            logger.info(f"IDE server stopped successfully for project {project_id}")
            return {"success": True, "message": "IDE server stopped successfully"}
        else:
            logger.warning(f"Failed to stop IDE server for project {project_id}")
            return {"success": False, "message": "Failed to stop IDE server or no server was running"}
        
    except Exception as e:
        logger.error(f"Error stopping IDE server for project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop IDE server: {str(e)}"
        )


@router.get("/{project_id}/ide/health")
async def check_ide_health(
    project_id: str,
    vm_service: VMProviderInterface = Depends(get_vm_service)
):
    """
    Health check endpoint for IDE server
    
    Performs a quick health check to verify if the IDE server
    is responding and accessible.
    """
    try:
        logger.info(f"Checking IDE health for project {project_id}")
        
        # Check if IDE is running
        is_running = await vm_service.is_ide_running(project_id)
        
        if is_running:
            # Get status for more details
            ide_status = await vm_service.get_ide_status(project_id)
            return {
                "healthy": True,
                "status": "running",
                "ide_type": ide_status.get("ide_type"),
                "url": ide_status.get("url")
            }
        else:
            return {
                "healthy": False,
                "status": "not_running",
                "message": "No IDE server is currently running"
            }
        
    except Exception as e:
        logger.error(f"Error checking IDE health for project {project_id}: {str(e)}")
        return {
            "healthy": False,
            "status": "error",
            "error": str(e)
        }


class VSCodeCustomizationRequest(BaseModel):
    """Request model for VS Code customization"""
    theme: Optional[str] = Field(default="Default Dark+", description="VS Code color theme")
    font_size: Optional[int] = Field(default=14, description="Editor font size")
    font_family: Optional[str] = Field(default="'Monaco', 'Menlo', 'Ubuntu Mono', monospace", description="Editor font family")
    tab_size: Optional[int] = Field(default=2, description="Tab size for indentation")
    settings: Optional[Dict[str, Any]] = Field(default=None, description="Additional VS Code settings")


@router.post("/{project_id}/ide/customize")
async def customize_vscode(
    project_id: str,
    customization: VSCodeCustomizationRequest = Body(...),
    vm_service: VMProviderInterface = Depends(get_vm_service)
):
    """
    Customize VS Code settings, themes, and preferences
    
    This endpoint allows you to:
    - Change color themes
    - Adjust font settings
    - Modify editor preferences
    - Apply custom settings
    """
    try:
        logger.info(f"Customizing VS Code for project {project_id}")
        
        # Check if project sandbox is active
        if not await vm_service.is_sandbox_active(project_id):
            raise HTTPException(
                status_code=400,
                detail="Project container is not active"
            )
        
        # Check if IDE is running
        if not await vm_service.is_ide_running(project_id):
            raise HTTPException(
                status_code=400,
                detail="VS Code server is not running. Please start it first."
            )
        
        # Build settings object
        new_settings = {
            "workbench.colorTheme": customization.theme,
            "editor.fontSize": customization.font_size,
            "editor.fontFamily": customization.font_family,
            "editor.tabSize": customization.tab_size,
            "editor.insertSpaces": True,
            "editor.wordWrap": "on",
            "editor.minimap.enabled": True,
            "editor.lineNumbers": "on",
            "files.autoSave": "onDelay",
            "files.autoSaveDelay": 1000,
            "terminal.integrated.fontSize": max(10, customization.font_size - 2),
            "explorer.confirmDelete": False,
            "telemetry.telemetryLevel": "off"
        }
        
        # Merge with any additional custom settings
        if customization.settings:
            new_settings.update(customization.settings)
        
        # Write settings to VS Code config
        import json
        settings_content = json.dumps(new_settings, indent=2)
        
        await vm_service.write_file(
            project_id,
            "~/.local/share/code-server/User/settings.json",
            settings_content
        )
        
        logger.info(f"VS Code customization applied for project {project_id}")
        
        return {
            "success": True,
            "message": "VS Code customization applied successfully",
            "applied_settings": new_settings
        }
        
    except Exception as e:
        logger.error(f"Error customizing VS Code for project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to customize VS Code: {str(e)}"
        )