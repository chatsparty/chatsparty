from typing import List, Optional
import uuid
import time

from ..core.database import db_manager
from ..models.database import VoiceConnection
from ..models.voice import (
    VoiceConnectionCreateRequest,
    VoiceConnectionUpdateRequest,
    VoiceConnectionResponse,
    VoiceConnectionTestResult
)
from ..services.voice.voice_service import VoiceService
from ..services.voice.domain.entities import VoiceConnection as VoiceConnectionEntity
from .crypto_service import crypto_service


class VoiceConnectionService:
    def __init__(self):
        self.voice_service = VoiceService()
    
    def create_voice_connection(self, request: VoiceConnectionCreateRequest, user_id: str) -> VoiceConnectionResponse:
        """Create a new voice connection"""
        with db_manager.get_sync_session() as session:
            connection_id = str(uuid.uuid4())
            
            # Handle API key encryption
            api_key = request.api_key
            api_key_encrypted = False
            if api_key is not None and api_key.strip() != "":
                api_key = crypto_service.encrypt(api_key)
                api_key_encrypted = True
            
            db_connection = VoiceConnection(
                id=connection_id,
                name=request.name,
                description=request.description,
                provider=request.provider,
                provider_type=request.provider_type,
                voice_id=request.voice_id,
                speed=request.speed,
                pitch=request.pitch,
                stability=request.stability,
                clarity=request.clarity,
                style=request.style,
                api_key=api_key,
                api_key_encrypted=api_key_encrypted,
                base_url=request.base_url,
                is_active=True,
                is_cloud_proxy=request.is_cloud_proxy,
                user_id=user_id
            )
            
            session.add(db_connection)
            session.commit()
            session.refresh(db_connection)
            
            return self._to_response(db_connection)
    
    def get_voice_connections(self, user_id: str) -> List[VoiceConnectionResponse]:
        """Get all voice connections for a user"""
        with db_manager.get_sync_session() as session:
            connections = session.query(VoiceConnection).filter(
                VoiceConnection.user_id == user_id
            ).all()
            return [self._to_response(conn) for conn in connections]
    
    def get_active_voice_connections(self, user_id: str) -> List[VoiceConnectionResponse]:
        """Get only active voice connections for a user"""
        with db_manager.get_sync_session() as session:
            connections = session.query(VoiceConnection).filter(
                VoiceConnection.user_id == user_id,
                VoiceConnection.is_active == True
            ).all()
            return [self._to_response(conn) for conn in connections]
    
    def get_voice_connection(self, connection_id: str, user_id: str) -> Optional[VoiceConnectionResponse]:
        """Get a specific voice connection"""
        with db_manager.get_sync_session() as session:
            connection = session.query(VoiceConnection).filter(
                VoiceConnection.id == connection_id,
                VoiceConnection.user_id == user_id
            ).first()
            return self._to_response(connection) if connection else None
    
    def update_voice_connection(
        self, 
        connection_id: str, 
        request: VoiceConnectionUpdateRequest, 
        user_id: str
    ) -> Optional[VoiceConnectionResponse]:
        """Update a voice connection"""
        with db_manager.get_sync_session() as session:
            connection = session.query(VoiceConnection).filter(
                VoiceConnection.id == connection_id,
                VoiceConnection.user_id == user_id
            ).first()
            
            if not connection:
                return None
            
            # Update fields if provided
            if request.name is not None:
                connection.name = request.name
            if request.description is not None:
                connection.description = request.description
            if request.voice_id is not None:
                connection.voice_id = request.voice_id
            if request.speed is not None:
                connection.speed = request.speed
            if request.pitch is not None:
                connection.pitch = request.pitch
            if request.stability is not None:
                connection.stability = request.stability
            if request.clarity is not None:
                connection.clarity = request.clarity
            if request.style is not None:
                connection.style = request.style
            if request.api_key is not None:
                if request.api_key.strip() != "":
                    connection.api_key = crypto_service.encrypt(request.api_key)
                    connection.api_key_encrypted = True
                else:
                    connection.api_key = request.api_key
                    connection.api_key_encrypted = False
            if request.base_url is not None:
                connection.base_url = request.base_url
            if request.is_active is not None:
                connection.is_active = request.is_active
            
            session.commit()
            session.refresh(connection)
            
            return self._to_response(connection)
    
    def delete_voice_connection(self, connection_id: str, user_id: str) -> bool:
        """Delete a voice connection"""
        with db_manager.get_sync_session() as session:
            connection = session.query(VoiceConnection).filter(
                VoiceConnection.id == connection_id,
                VoiceConnection.user_id == user_id
            ).first()
            
            if not connection:
                return False
            
            session.delete(connection)
            session.commit()
            return True
    
    async def test_voice_connection_data(
        self, 
        request: VoiceConnectionCreateRequest, 
        user_id: str
    ) -> VoiceConnectionTestResult:
        """Test a voice connection configuration without saving it to database"""
        # Create domain entity from request data (no encryption for test data)
        voice_connection_entity = VoiceConnectionEntity(
            id="temp-test",
            name=request.name,
            description=request.description,
            provider=request.provider,
            provider_type=request.provider_type,
            voice_id=request.voice_id,
            speed=request.speed or 1.0,
            pitch=request.pitch or 1.0,
            stability=request.stability or 0.75,
            clarity=request.clarity or 0.8,
            style=request.style or 'conversational',
            api_key=request.api_key,  # Use raw API key for testing
            api_key_encrypted=False,
            base_url=request.base_url,
            is_active=True,
            is_cloud_proxy=request.is_cloud_proxy or False,
            user_id=user_id
        )
        
        # Test the connection
        start_time = time.time()
        try:
            test_result = await self.voice_service.test_voice_connection(voice_connection_entity)
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            
            return VoiceConnectionTestResult(
                success=test_result.success,
                message=test_result.message,
                details=test_result.details,
                latency_ms=latency_ms,
                provider_info=test_result.provider_info
            )
            
        except Exception as e:
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            
            return VoiceConnectionTestResult(
                success=False,
                message=f"Test failed: {str(e)}",
                latency_ms=latency_ms
            )

    async def test_voice_connection(self, connection_id: str, user_id: str) -> VoiceConnectionTestResult:
        """Test a voice connection by making actual API calls"""
        with db_manager.get_sync_session() as session:
            connection = session.query(VoiceConnection).filter(
                VoiceConnection.id == connection_id,
                VoiceConnection.user_id == user_id
            ).first()
            
            if not connection:
                return VoiceConnectionTestResult(
                    success=False,
                    message="Voice connection not found"
                )
            
            if not connection.is_active:
                return VoiceConnectionTestResult(
                    success=False,
                    message="Voice connection is inactive"
                )
            
            # Convert to domain entity with decrypted API key
            decrypted_api_key = self._decrypt_api_key(connection)
            voice_connection_entity = VoiceConnectionEntity(
                id=connection.id,
                name=connection.name,
                description=connection.description,
                provider=connection.provider,
                provider_type=connection.provider_type,
                voice_id=connection.voice_id,
                speed=connection.speed,
                pitch=connection.pitch,
                stability=connection.stability,
                clarity=connection.clarity,
                style=connection.style,
                api_key=decrypted_api_key,
                api_key_encrypted=connection.api_key_encrypted,
                base_url=connection.base_url,
                is_active=connection.is_active,
                is_cloud_proxy=connection.is_cloud_proxy,
                user_id=connection.user_id,
                created_at=connection.created_at,
                updated_at=connection.updated_at
            )
            
            # Test the connection
            start_time = time.time()
            try:
                test_result = await self.voice_service.test_voice_connection(voice_connection_entity)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                
                return VoiceConnectionTestResult(
                    success=test_result.success,
                    message=test_result.message,
                    details=test_result.details,
                    latency_ms=latency_ms,
                    provider_info=test_result.provider_info
                )
                
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                
                return VoiceConnectionTestResult(
                    success=False,
                    message=f"Test failed: {str(e)}",
                    latency_ms=latency_ms
                )
    
    def _to_response(self, connection: VoiceConnection) -> VoiceConnectionResponse:
        """Convert database model to response model"""
        return VoiceConnectionResponse(
            id=connection.id,
            name=connection.name,
            description=connection.description,
            provider=connection.provider,
            provider_type=connection.provider_type,
            voice_id=connection.voice_id,
            speed=connection.speed,
            pitch=connection.pitch,
            stability=connection.stability,
            clarity=connection.clarity,
            style=connection.style,
            api_key_encrypted=connection.api_key_encrypted,
            is_active=connection.is_active,
            is_cloud_proxy=connection.is_cloud_proxy,
            user_id=connection.user_id,
            created_at=connection.created_at,
            updated_at=connection.updated_at
        )
    
    def _decrypt_api_key(self, connection: VoiceConnection) -> str:
        """Get decrypted API key from voice connection"""
        if not connection.api_key:
            return None
        
        if connection.api_key_encrypted:
            try:
                return crypto_service.decrypt(connection.api_key)
            except Exception as e:
                print(f"Warning: Failed to decrypt API key for voice connection {connection.id}: {e}")
                return None
        else:
            return connection.api_key


# Global instance
voice_connection_service = VoiceConnectionService()