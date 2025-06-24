import uuid
import time
from typing import Dict, List, Optional
from datetime import datetime
from app.models.chat import (
    ConnectionCreateRequest, 
    ConnectionUpdateRequest, 
    ConnectionResponse, 
    ConnectionTestResult,
    ModelConfig
)
from app.services.ai.infrastructure.database_repositories import RepositoryFactory
from app.services.mcp.mcp_client_service import get_mcp_client_service
from app.core.error_handler import DatabaseErrorHandler
from sqlalchemy.exc import SQLAlchemyError


class ConnectionService:
    """Service for managing model connections"""
    
    def __init__(self):
        self.mcp_client_service = get_mcp_client_service()
        self._initialize_default_connections()
    
    def create_connection(self, request: ConnectionCreateRequest, user_id: str) -> ConnectionResponse:
        """Create a new connection"""
        try:
            connection_id = str(uuid.uuid4())
            
            connection_data = {
                "id": connection_id,
                "name": request.name,
                "description": request.description,
                "provider": request.provider,
                "model_name": request.model_name,
                "api_key": request.api_key,
                "base_url": request.base_url,
                "is_active": True,
                "user_id": user_id,
                "mcp_server_url": getattr(request, 'mcp_server_url', None),
                "mcp_server_config": getattr(request, 'mcp_server_config', None),
                "available_tools": getattr(request, 'available_tools', None),
                "mcp_capabilities": getattr(request, 'mcp_capabilities', None)
            }
            
            with RepositoryFactory.create_connection_repository_with_session() as repo:
                saved_connection = repo.create_connection(connection_data)
                repo.commit()
                return ConnectionResponse(**saved_connection)
        except SQLAlchemyError as e:
            raise DatabaseErrorHandler.handle_db_error(e, "creating connection", "Failed to create connection")
        except Exception as e:
            raise DatabaseErrorHandler.handle_db_error(e, "creating connection", "Failed to create connection")
    
    def get_connections(self, user_id: str = None) -> List[ConnectionResponse]:
        """Get all connections"""
        try:
            with RepositoryFactory.create_connection_repository_with_session() as repo:
                connections = repo.get_all_connections(user_id)
                return [ConnectionResponse(**conn) for conn in connections]
        except SQLAlchemyError as e:
            raise DatabaseErrorHandler.handle_query_error(e, "connections")
        except Exception as e:
            raise DatabaseErrorHandler.handle_query_error(e, "connections")
    
    def get_connection(self, connection_id: str, user_id: str = None) -> Optional[ConnectionResponse]:
        """Get a specific connection"""
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            connection = repo.get_connection(connection_id, user_id)
            if connection:
                return ConnectionResponse(**connection)
            return None
    
    def update_connection(self, connection_id: str, request: ConnectionUpdateRequest, user_id: str = None) -> Optional[ConnectionResponse]:
        """Update an existing connection"""
        update_data = request.dict(exclude_unset=True)
        
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            updated_connection = repo.update_connection(connection_id, update_data, user_id)
            if updated_connection:
                repo.commit()
                return ConnectionResponse(**updated_connection)
            return None
    
    def delete_connection(self, connection_id: str, user_id: str = None) -> bool:
        """Delete a connection"""
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            success = repo.delete_connection(connection_id, user_id)
            if success:
                repo.commit()
            return success
    
    async def test_connection(self, connection_id: str, user_id: str = None) -> ConnectionTestResult:
        """Test a connection"""
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            connection = repo.get_connection(connection_id, user_id)
            if not connection:
                return ConnectionTestResult(
                    success=False,
                    message="Connection not found"
                )
            
            try:
                model_config = ModelConfig(
                    provider=connection["provider"],
                    model_name=connection["model_name"],
                    api_key=connection.get("api_key"),
                    base_url=connection.get("base_url")
                )
                
                start_time = time.time()
                
                if connection["provider"] == "mcp":
                    return await self._test_mcp_connection(connection)
                
                elif connection["provider"] == "ollama":
                    import requests
                    base_url = connection.get("base_url", "http://localhost:11434")
                    models_url = f"{base_url}/v1/models"
                    
                    response = requests.get(models_url, timeout=5)
                    response.raise_for_status()
                    
                    models_data = response.json()
                    available_models = [model["id"] for model in models_data.get("data", [])]
                    
                    if connection["model_name"] in available_models:
                        latency = (time.time() - start_time) * 1000
                        return ConnectionTestResult(
                            success=True,
                            message="Connection successful",
                            latency=round(latency, 2)
                        )
                    else:
                        return ConnectionTestResult(
                            success=False,
                            message=f"Model '{connection['model_name']}' not available"
                        )
                
                latency = (time.time() - start_time) * 1000
                return ConnectionTestResult(
                    success=True,
                    message="Connection configured (testing not fully implemented for this provider)",
                    latency=round(latency, 2)
                )
                
            except Exception as e:
                return ConnectionTestResult(
                    success=False,
                    message=f"Connection test failed: {str(e)}"
                )
    
    def get_active_connections(self, user_id: str = None) -> List[ConnectionResponse]:
        """Get only active connections"""
        try:
            with RepositoryFactory.create_connection_repository_with_session() as repo:
                connections = repo.get_active_connections(user_id)
                return [ConnectionResponse(**conn) for conn in connections]
        except SQLAlchemyError as e:
            raise DatabaseErrorHandler.handle_query_error(e, "active connections")
        except Exception as e:
            raise DatabaseErrorHandler.handle_query_error(e, "active connections")
    
    def get_connection_model_config(self, connection_id: str, user_id: str = None) -> Optional[ModelConfig]:
        """Get ModelConfig for a connection (for backward compatibility with agents)"""
        connection = self.get_connection(connection_id, user_id)
        if connection:
            return ModelConfig(
                provider=connection.provider,
                model_name=connection.model_name,
                api_key=connection.api_key,
                base_url=connection.base_url
            )
        return None
    
    def _initialize_default_connections(self):
        """Initialize some default connections for testing"""
        pass
    
    def create_default_connections_for_user(self, user_id: str):
        """Create default connections for a new user"""
        default_connections = [
            {
                "name": "Ollama Local - Gemma2",
                "description": "Local Ollama instance with Gemma2 2B model",
                "provider": "ollama",
                "model_name": "gemma2:2b",
                "base_url": "http://localhost:11434"
            },
            {
                "name": "Ollama Local - Gemma3",
                "description": "Local Ollama instance with Gemma3 4B model", 
                "provider": "ollama",
                "model_name": "gemma3:4b",
                "base_url": "http://localhost:11434"
            }
        ]
        
        for conn_data in default_connections:
            request = ConnectionCreateRequest(**conn_data)
            self.create_connection(request, user_id)
    
    
    async def test_mcp_connection(self, server_url: str, server_config: Optional[Dict] = None) -> ConnectionTestResult:
        """Test MCP server connection without storing it"""
        try:
            start_time = time.time()
            result = await self.mcp_client_service.test_connection(server_url, server_config)
            latency = (time.time() - start_time) * 1000
            
            if result['success']:
                capabilities = result['capabilities']
                tools_count = len(capabilities.get('tools', []))
                resources_count = len(capabilities.get('resources', []))
                
                return ConnectionTestResult(
                    success=True,
                    message=f"MCP server connected successfully. Found {tools_count} tools, {resources_count} resources",
                    latency=round(latency, 2)
                )
            else:
                return ConnectionTestResult(
                    success=False,
                    message=f"MCP connection failed: {result.get('error', 'Unknown error')}"
                )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message=f"MCP connection test failed: {str(e)}"
            )
    
    async def _test_mcp_connection(self, connection: Dict) -> ConnectionTestResult:
        """Internal method to test existing MCP connection"""
        server_url = connection.get("mcp_server_url") or connection.get("base_url")
        server_config = connection.get("mcp_server_config")
        
        if not server_url:
            return ConnectionTestResult(
                success=False,
                message="No MCP server URL configured"
            )
        
        return await self.test_mcp_connection(server_url, server_config)
    
    async def discover_mcp_tools(self, connection_id: str, user_id: str = None) -> List[Dict]:
        """Discover and cache MCP server tools"""
        try:
            connection = self.get_connection(connection_id, user_id)
            if not connection or connection.provider != "mcp":
                raise ValueError("Invalid MCP connection")
            
            server_url = connection.mcp_server_url or connection.base_url
            server_config = connection.mcp_server_config
            
            session = self.mcp_client_service.get_connection(connection_id)
            if not session:
                await self.mcp_client_service.connect_to_server(
                    connection_id, server_url, server_config
                )
            
            capabilities = await self.mcp_client_service.discover_capabilities(connection_id)
            tools = capabilities.get('tools', [])
            
            update_data = {
                'available_tools': tools,
                'mcp_capabilities': capabilities
            }
            
            with RepositoryFactory.create_connection_repository_with_session() as repo:
                repo.update_connection(connection_id, update_data, user_id)
                repo.commit()
            
            return tools
            
        except Exception as e:
            raise Exception(f"Failed to discover MCP tools: {str(e)}")
    
    async def update_mcp_capabilities(self, connection_id: str, user_id: str = None) -> Dict:
        """Update cached MCP server capabilities"""
        try:
            connection = self.get_connection(connection_id, user_id)
            if not connection or connection.provider != "mcp":
                raise ValueError("Invalid MCP connection")
            
            capabilities = await self.mcp_client_service.discover_capabilities(connection_id)
            
            update_data = {
                'available_tools': capabilities.get('tools', []),
                'mcp_capabilities': capabilities
            }
            
            with RepositoryFactory.create_connection_repository_with_session() as repo:
                repo.update_connection(connection_id, update_data, user_id)
                repo.commit()
            
            return capabilities
            
        except Exception as e:
            raise Exception(f"Failed to update MCP capabilities: {str(e)}")
    
    def get_mcp_tools(self, connection_id: str, user_id: str = None) -> List[Dict]:
        """Get cached MCP tools for a connection"""
        connection = self.get_connection(connection_id, user_id)
        if connection and connection.provider == "mcp":
            return connection.available_tools or []
        return []
    
    def get_mcp_connections(self, user_id: str = None) -> List[ConnectionResponse]:
        """Get all MCP connections"""
        all_connections = self.get_connections(user_id)
        return [conn for conn in all_connections if conn.provider == "mcp"]


connection_service = ConnectionService()