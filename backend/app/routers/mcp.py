from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..services.connection_service import connection_service
from ..services.mcp.mcp_client_service import MCPClientService
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp", tags=["mcp"])

class MCPServerCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    server_url: str
    server_config: Optional[Dict[str, Any]] = None

class MCPServerUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    server_url: Optional[str] = None
    server_config: Optional[Dict[str, Any]] = None

class MCPServerResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    server_url: str
    server_config: Optional[Dict[str, Any]]
    available_tools: Optional[List[str]]
    status: str

class MCPTestConnectionRequest(BaseModel):
    server_url: str
    server_config: Optional[Dict[str, Any]] = None

@router.get("/servers", response_model=List[MCPServerResponse])
async def list_mcp_servers():
    """Get all MCP servers"""
    try:
        # Get all MCP connections (servers)
        connections = connection_service.get_mcp_connections()
        
        servers = []
        for conn in connections:
            servers.append(MCPServerResponse(
                id=conn.id,
                name=conn.name,
                description=conn.description,
                server_url=getattr(conn, 'mcp_server_url', '') or "",
                server_config=getattr(conn, 'mcp_server_config', {}) or {},
                available_tools=getattr(conn, 'available_tools', []) or [],
                status="active" if conn.is_active else "inactive"
            ))
        
        return servers
    except Exception as e:
        logger.error(f"Failed to list MCP servers: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve MCP servers")

@router.post("/servers", response_model=MCPServerResponse)
async def create_mcp_server(request: MCPServerCreateRequest):
    """Create a new MCP server"""
    try:
        mcp_client_service = MCPClientService()
        
        # Test the connection first
        try:
            test_result = await mcp_client_service.test_connection(
                request.server_url, 
                request.server_config
            )
            if test_result.get('success'):
                capabilities = test_result.get('capabilities', {})
                available_tools = list(capabilities.get("tools", {}).keys()) if capabilities else []
                status = "active"
            else:
                logger.warning(f"Failed to test MCP server connection: {test_result.get('error')}")
                capabilities = {}
                available_tools = []
                status = "error"
        except Exception as e:
            logger.warning(f"Failed to test MCP server connection: {e}")
            capabilities = {}
            available_tools = []
            status = "error"
        
        # Create a ConnectionCreateRequest for the MCP server
        from ..models.chat import ConnectionCreateRequest
        connection_request = ConnectionCreateRequest(
            name=request.name,
            description=request.description,
            provider="mcp",
            model_name="mcp-server",  # Placeholder
            api_key=None,
            base_url=None
        )
        
        # Add MCP-specific fields
        setattr(connection_request, 'mcp_server_url', request.server_url)
        setattr(connection_request, 'mcp_server_config', request.server_config)
        setattr(connection_request, 'available_tools', available_tools)
        setattr(connection_request, 'mcp_capabilities', capabilities)
        
        # For now, create without user_id (we'll need to add auth later)
        connection = connection_service.create_connection(connection_request, "system")
        
        return MCPServerResponse(
            id=connection.id,
            name=connection.name,
            description=connection.description,
            server_url=getattr(connection, 'mcp_server_url', '') or "",
            server_config=getattr(connection, 'mcp_server_config', {}) or {},
            available_tools=getattr(connection, 'available_tools', []) or [],
            status=status
        )
    except Exception as e:
        logger.error(f"Failed to create MCP server: {e}")
        raise HTTPException(status_code=500, detail="Failed to create MCP server")

@router.put("/servers/{server_id}", response_model=MCPServerResponse)
async def update_mcp_server(
    server_id: str,
    request: MCPServerUpdateRequest
):
    """Update an existing MCP server"""
    try:
        # Get existing connection
        connection = connection_service.get_connection(server_id)
        if not connection:
            raise HTTPException(status_code=404, detail="MCP server not found")
        
        # Update fields
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.server_url is not None:
            update_data["mcp_server_url"] = request.server_url
        if request.server_config is not None:
            update_data["mcp_server_config"] = request.server_config
        
        # If URL or config changed, re-discover capabilities
        if request.server_url is not None or request.server_config is not None:
            try:
                mcp_client_service = MCPClientService()
                test_result = await mcp_client_service.test_connection(
                    request.server_url or getattr(connection, 'mcp_server_url', ''), 
                    request.server_config or getattr(connection, 'mcp_server_config', {})
                )
                if test_result.get('success'):
                    capabilities = test_result.get('capabilities', {})
                    update_data["available_tools"] = list(capabilities.get("tools", {}).keys()) if capabilities else []
                    update_data["mcp_capabilities"] = capabilities
                else:
                    logger.warning(f"Failed to test updated MCP server: {test_result.get('error')}")
            except Exception as e:
                logger.warning(f"Failed to re-discover capabilities: {e}")
        
        # Update connection
        updated_connection = connection_service.update_connection(server_id, update_data)
        
        return MCPServerResponse(
            id=updated_connection.id,
            name=updated_connection.name,
            description=updated_connection.description,
            server_url=updated_connection.mcp_server_url,
            server_config=updated_connection.mcp_server_config,
            available_tools=updated_connection.available_tools,
            status="active" if updated_connection.is_active else "inactive"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update MCP server: {e}")
        raise HTTPException(status_code=500, detail="Failed to update MCP server")

@router.delete("/servers/{server_id}")
async def delete_mcp_server(server_id: str):
    """Delete an MCP server"""
    try:
        # Check if connection exists
        connection = connection_service.get_connection(server_id)
        if not connection:
            raise HTTPException(status_code=404, detail="MCP server not found")
        
        # Delete the connection
        success = connection_service.delete_connection(server_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete MCP server")
        
        return {"message": "MCP server deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete MCP server: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete MCP server")

@router.post("/test-connection")
async def test_mcp_connection(request: MCPTestConnectionRequest):
    """Test connection to an MCP server"""
    import asyncio
    
    try:
        mcp_client_service = MCPClientService()
        
        # Add overall timeout to prevent hanging requests
        logger.info(f"Starting MCP connection test with 30s timeout: {request.server_url}")
        
        test_result = await asyncio.wait_for(
            mcp_client_service.test_connection(
                request.server_url, 
                request.server_config
            ),
            timeout=30.0  # 30 second overall timeout for the entire test
        )
        
        if test_result.get('success'):
            capabilities = test_result.get('capabilities', {})
            available_tools = list(capabilities.get("tools", {}).keys()) if capabilities else []
            
            logger.info(f"MCP connection test succeeded: {len(available_tools)} tools found")
            return {
                "success": True,
                "available_tools": available_tools,
                "capabilities": capabilities
            }
        else:
            logger.warning(f"MCP connection test failed: {test_result.get('error')}")
            return {
                "success": False,
                "error": test_result.get('error', 'Unknown error')
            }
    except asyncio.TimeoutError:
        logger.error(f"MCP connection test timed out after 30s: {request.server_url}")
        return {
            "success": False,
            "error": "Connection test timed out after 30 seconds. The MCP server may be unresponsive."
        }
    except Exception as e:
        logger.error(f"MCP connection test failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/servers/{server_id}/tools")
async def get_server_tools(server_id: str):
    """Get available tools for a specific MCP server"""
    try:
        connection = connection_service.get_connection(server_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="MCP server not found")
        
        return {
            "server_id": server_id,
            "server_name": connection.name,
            "available_tools": connection.available_tools or [],
            "capabilities": connection.mcp_capabilities or {}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get server tools: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve server tools")