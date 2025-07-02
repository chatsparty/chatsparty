import uuid
import time
from typing import Dict, List, Optional
from app.models.chat import (
    ConnectionCreateRequest, 
    ConnectionUpdateRequest, 
    ConnectionResponse, 
    ConnectionTestResult,
    ModelConfig
)
from app.services.ai.infrastructure.database_repositories import RepositoryFactory
from app.core.error_handler import DatabaseErrorHandler
from sqlalchemy.exc import SQLAlchemyError


class ConnectionService:
    """Service for managing model connections"""
    
    def __init__(self):
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
                connection_responses = [ConnectionResponse(**conn) for conn in connections]
                
                from ..core.config import settings
                if settings.chatsparty_default_enabled:
                    default_connection = self._create_virtual_default_connection()
                    connection_responses.insert(0, default_connection)
                
                return connection_responses
        except SQLAlchemyError as e:
            raise DatabaseErrorHandler.handle_query_error(e, "connections")
        except Exception as e:
            raise DatabaseErrorHandler.handle_query_error(e, "connections")
    
    def get_connection(self, connection_id: str, user_id: str = None) -> Optional[ConnectionResponse]:
        """Get a specific connection"""
        from ..core.config import settings
        if connection_id == "chatsparty-default" and settings.chatsparty_default_enabled:
            return self._create_virtual_default_connection()
        
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            connection = repo.get_connection(connection_id, user_id)
            if connection:
                return ConnectionResponse(**connection)
            return None
    
    def update_connection(self, connection_id: str, request: ConnectionUpdateRequest, user_id: str = None) -> Optional[ConnectionResponse]:
        """Update an existing connection"""
        if connection_id == "chatsparty-default":
            raise ValueError("Cannot update the default ChatsParty connection")
        
        update_data = request.dict(exclude_unset=True)
        
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            updated_connection = repo.update_connection(connection_id, update_data, user_id)
            if updated_connection:
                repo.commit()
                return ConnectionResponse(**updated_connection)
            return None
    
    def delete_connection(self, connection_id: str, user_id: str = None) -> bool:
        """Delete a connection"""
        if connection_id == "chatsparty-default":
            raise ValueError("Cannot delete the default ChatsParty connection")
        
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            success = repo.delete_connection(connection_id, user_id)
            if success:
                repo.commit()
            return success
    
    async def test_connection(self, connection_id: str, user_id: str = None) -> ConnectionTestResult:
        """Test a connection"""
        if connection_id == "chatsparty-default":
            return ConnectionTestResult(
                success=True,
                message="Default ChatsParty connection is always available",
                latency=0
            )
        
        with RepositoryFactory.create_connection_repository_with_session() as repo:
            connection = repo.get_connection(connection_id, user_id)
            if not connection:
                return ConnectionTestResult(
                    success=False,
                    message="Connection not found"
                )
            
            try:
                ModelConfig(
                    provider=connection["provider"],
                    model_name=connection["model_name"],
                    api_key=connection.get("api_key"),
                    base_url=connection.get("base_url")
                )
                
                start_time = time.time()
                
                if connection["provider"] == "ollama":
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
                connection_responses = [ConnectionResponse(**conn) for conn in connections]
                
                from ..core.config import settings
                if settings.chatsparty_default_enabled:
                    default_connection = self._create_virtual_default_connection()
                    connection_responses.insert(0, default_connection)
                
                return connection_responses
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
    
    def _create_virtual_default_connection(self) -> ConnectionResponse:
        """Create a virtual default ChatsParty connection"""
        from ..core.config import settings
        from datetime import datetime
        
        return ConnectionResponse(
            id="chatsparty-default",
            name="ChatsParty Default",
            description=f"Default ChatsParty platform connection with {settings.chatsparty_default_model}",
            provider="chatsparty",
            model_name=settings.chatsparty_default_model,
            api_key=settings.chatsparty_default_api_key,
            base_url=settings.chatsparty_default_base_url,
            is_active=True,
            is_default=True,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
    
    def create_default_connections_for_user(self, user_id: str):
        """Create default connections for a new user"""
        from ..core.config import settings
        
        default_connections = []
        
        if settings.chatsparty_default_enabled:
            chatsparty_connection = {
                "name": "ChatsParty Default",
                "description": f"Default ChatsParty platform connection with {settings.chatsparty_default_model}",
                "provider": "chatsparty",
                "model_name": settings.chatsparty_default_model,
                "is_active": True,
                "is_default": True
            }
            
            if settings.chatsparty_default_api_key:
                chatsparty_connection["api_key"] = settings.chatsparty_default_api_key
            if settings.chatsparty_default_base_url:
                chatsparty_connection["base_url"] = settings.chatsparty_default_base_url
                
            default_connections.append(chatsparty_connection)
        
        default_connections.extend([
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
        ])
        
        for conn_data in default_connections:
            request = ConnectionCreateRequest(**conn_data)
            self.create_connection(request, user_id)
    
    


connection_service = ConnectionService()