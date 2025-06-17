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
from app.services.ai.infrastructure.unified_model_service import UnifiedModelService
from app.services.ai.infrastructure.database_repositories import RepositoryFactory


class ConnectionService:
    """Service for managing model connections"""
    
    def __init__(self):
        self.model_service = UnifiedModelService()
        self.connection_repository = RepositoryFactory.create_connection_repository()
        self._initialize_default_connections()
    
    def create_connection(self, request: ConnectionCreateRequest, user_id: str) -> ConnectionResponse:
        """Create a new connection"""
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
            "user_id": user_id
        }
        
        saved_connection = self.connection_repository.create_connection(connection_data)
        self.connection_repository.commit()
        return ConnectionResponse(**saved_connection)
    
    def get_connections(self, user_id: str = None) -> List[ConnectionResponse]:
        """Get all connections"""
        connections = self.connection_repository.get_all_connections(user_id)
        return [ConnectionResponse(**conn) for conn in connections]
    
    def get_connection(self, connection_id: str, user_id: str = None) -> Optional[ConnectionResponse]:
        """Get a specific connection"""
        connection = self.connection_repository.get_connection(connection_id, user_id)
        if connection:
            return ConnectionResponse(**connection)
        return None
    
    def update_connection(self, connection_id: str, request: ConnectionUpdateRequest, user_id: str = None) -> Optional[ConnectionResponse]:
        """Update an existing connection"""
        update_data = request.dict(exclude_unset=True)
        
        updated_connection = self.connection_repository.update_connection(connection_id, update_data, user_id)
        if updated_connection:
            self.connection_repository.commit()
            return ConnectionResponse(**updated_connection)
        return None
    
    def delete_connection(self, connection_id: str, user_id: str = None) -> bool:
        """Delete a connection"""
        success = self.connection_repository.delete_connection(connection_id, user_id)
        if success:
            self.connection_repository.commit()
        return success
    
    def test_connection(self, connection_id: str, user_id: str = None) -> ConnectionTestResult:
        """Test a connection"""
        connection = self.connection_repository.get_connection(connection_id, user_id)
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
        connections = self.connection_repository.get_active_connections(user_id)
        return [ConnectionResponse(**conn) for conn in connections]
    
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
        # Skip default connection initialization since we now require user_id
        # Default connections should be created per user when they register
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


connection_service = ConnectionService()