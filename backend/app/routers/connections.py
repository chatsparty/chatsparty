from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
from app.models.chat import (
    ConnectionCreateRequest,
    ConnectionUpdateRequest, 
    ConnectionResponse,
    ConnectionTestResult
)
from app.models.database import User
from app.services.connection_service import connection_service
from app.core.error_handler import DatabaseErrorHandler
from .auth import get_current_user_dependency
from app.core.config import settings

router = APIRouter()


# Pydantic models for MCP requests
class MCPTestRequest(BaseModel):
    server_url: str
    server_config: Optional[Dict[str, Any]] = None


class MCPCapabilitiesResponse(BaseModel):
    success: bool
    capabilities: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class MCPToolsResponse(BaseModel):
    tools: List[Dict[str, Any]]


@router.post("/connections", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    request: ConnectionCreateRequest,
    current_user: User = Depends(get_current_user_dependency)
):
    """Create a new model connection"""
    try:
        connection = connection_service.create_connection(request, current_user.id)
        return connection
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_db_error(
            e, 
            operation="creating connection",
            user_message="Failed to create connection",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        raise DatabaseErrorHandler.handle_db_error(
            e,
            operation="creating connection", 
            user_message="Failed to create connection",
            status_code=status.HTTP_400_BAD_REQUEST
        )


@router.get("/connections", response_model=List[ConnectionResponse])
async def get_connections(current_user: User = Depends(get_current_user_dependency)):
    """Get all model connections"""
    try:
        connections = connection_service.get_connections(current_user.id)
        return connections
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_query_error(e, "connections")
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "connections")


@router.get("/connections/active", response_model=List[ConnectionResponse])
async def get_active_connections(current_user: User = Depends(get_current_user_dependency)):
    """Get only active model connections"""
    try:
        connections = connection_service.get_active_connections(current_user.id)
        return connections
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_query_error(e, "active connections")
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "active connections")


@router.get("/connections/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Get a specific model connection"""
    connection = connection_service.get_connection(connection_id, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    return connection


@router.put("/connections/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: str, request: ConnectionUpdateRequest, current_user: User = Depends(get_current_user_dependency)):
    """Update a model connection"""
    connection = connection_service.update_connection(connection_id, request, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    return connection


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Delete a model connection"""
    try:
        success = connection_service.delete_connection(connection_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found"
            )
    except ValueError as e:
        if "Cannot delete the default" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete the default ChatsParty connection"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/connections/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Test a model connection"""
    result = await connection_service.test_connection(connection_id, current_user.id)
    return result


# MCP-specific endpoints

if settings.enable_mcp:
    @router.post("/connections/mcp/test", response_model=ConnectionTestResult)
    async def test_mcp_connection(
        request: MCPTestRequest,
        _current_user: User = Depends(get_current_user_dependency)
    ):
        """Test MCP server connection without storing it"""
        try:
            result = await connection_service.test_mcp_connection(
                request.server_url, 
                request.server_config
            )
            return result
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message=f"MCP connection test failed: {str(e)}"
            )


    @router.get("/connections/mcp", response_model=List[ConnectionResponse])
    async def get_mcp_connections(current_user: User = Depends(get_current_user_dependency)):
        """Get all MCP connections"""
        try:
            connections = connection_service.get_mcp_connections(current_user.id)
            return connections
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get MCP connections: {str(e)}"
            )


    @router.get("/connections/{connection_id}/mcp/tools", response_model=MCPToolsResponse)
    async def get_mcp_tools(
        connection_id: str, 
        current_user: User = Depends(get_current_user_dependency)
    ):
        """Get available MCP tools for a connection"""
        try:
            tools = connection_service.get_mcp_tools(connection_id, current_user.id)
            return MCPToolsResponse(tools=tools)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get MCP tools: {str(e)}"
            )


    @router.post("/connections/{connection_id}/mcp/discover", response_model=MCPCapabilitiesResponse)
    async def discover_mcp_capabilities(
        connection_id: str,
        current_user: User = Depends(get_current_user_dependency)
    ):
        """Discover and cache MCP server capabilities"""
        try:
            capabilities = await connection_service.update_mcp_capabilities(connection_id, current_user.id)
            return MCPCapabilitiesResponse(
                success=True,
                capabilities=capabilities
            )
        except Exception as e:
            return MCPCapabilitiesResponse(
                success=False,
                error=str(e)
            )


    @router.post("/connections/{connection_id}/mcp/tools/discover", response_model=MCPToolsResponse)
    async def discover_mcp_tools(
        connection_id: str,
        current_user: User = Depends(get_current_user_dependency)
    ):
        """Discover and cache MCP server tools"""
        try:
            tools = await connection_service.discover_mcp_tools(connection_id, current_user.id)
            return MCPToolsResponse(tools=tools)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to discover MCP tools: {str(e)}"
            )