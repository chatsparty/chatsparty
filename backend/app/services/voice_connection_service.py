from typing import List, Optional
import uuid
import time
import logging
from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from ..models.database import VoiceConnection
from ..models.voice import (
    VoiceConnectionCreateRequest,
    VoiceConnectionUpdateRequest,
    VoiceConnectionResponse,
    VoiceConnectionTestResult,
    VoiceOption
)
from ..services.voice.voice_service import VoiceService
from ..services.voice.domain.entities import VoiceConnection as VoiceConnectionEntity
from .shared.crypto_service import crypto_service
from ..core.config import settings

logger = logging.getLogger(__name__)


class VoiceConnectionService:
    def __init__(self):
        self.voice_service = VoiceService()
    
    async def create_voice_connection(self, session: AsyncSession, request: VoiceConnectionCreateRequest, user_id: str) -> VoiceConnectionResponse:
        """Create a new voice connection"""
        connection_id = str(uuid.uuid4())
        
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
        session.flush()  # Get the ID without committing
        session.refresh(db_connection)
        
        return self._to_response(db_connection)
    
    async def get_voice_connections(self, session: AsyncSession, user_id: str) -> List[VoiceConnectionResponse]:
        """Get all voice connections for a user"""
        connections = []
        
        if settings.chatsparty_default_voice_enabled:
            connections.append(self._create_virtual_default_voice_connection())
        
        stmt = select(VoiceConnection).where(VoiceConnection.user_id == user_id)
        result = await session.exec(stmt)
        db_connections = result.all()
        connections.extend([self._to_response(conn) for conn in db_connections])
        
        return connections
    
    async def get_active_voice_connections(self, session: AsyncSession, user_id: str) -> List[VoiceConnectionResponse]:
        """Get only active voice connections for a user"""
        stmt = select(VoiceConnection).where(
            VoiceConnection.user_id == user_id,
            VoiceConnection.is_active == True
        )
        result = await session.exec(stmt)
        connections = result.all()
        return [self._to_response(conn) for conn in connections]
    
    async def get_voice_connection(self, session: AsyncSession, connection_id: str, user_id: str) -> Optional[VoiceConnectionResponse]:
        """Get a specific voice connection"""
        if connection_id == "chatsparty-default-voice" and settings.chatsparty_default_voice_enabled:
            return self._create_virtual_default_voice_connection()
        
        stmt = select(VoiceConnection).where(
            VoiceConnection.id == connection_id,
            VoiceConnection.user_id == user_id
        )
        result = await session.exec(stmt)
        connection = result.first()
        return self._to_response(connection) if connection else None
    
    async def update_voice_connection(
        self, 
        session: AsyncSession,
        connection_id: str, 
        request: VoiceConnectionUpdateRequest, 
        user_id: str
    ) -> Optional[VoiceConnectionResponse]:
        """Update a voice connection"""
        if connection_id == "chatsparty-default-voice":
            raise ValueError("Cannot update default voice connection")
        
        stmt = select(VoiceConnection).where(
            VoiceConnection.id == connection_id,
            VoiceConnection.user_id == user_id
        )
        result = await session.exec(stmt)
        connection = result.first()
        
        if not connection:
            return None
        
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
        
        await session.flush()  # Ensure changes are visible
        await session.refresh(connection)
        
        return self._to_response(connection)
    
    async def delete_voice_connection(self, session: AsyncSession, connection_id: str, user_id: str) -> bool:
        """Delete a voice connection"""
        if connection_id == "chatsparty-default-voice":
            raise ValueError("Cannot delete default voice connection")
        
        stmt = select(VoiceConnection).where(
            VoiceConnection.id == connection_id,
            VoiceConnection.user_id == user_id
        )
        result = await session.exec(stmt)
        connection = result.first()
        
        if not connection:
            return False
        
        await session.delete(connection)
        return True
    
    async def test_voice_connection_data(
        self, 
        request: VoiceConnectionCreateRequest, 
        user_id: str
    ) -> VoiceConnectionTestResult:
        """Test a voice connection configuration without saving it to database"""
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
            api_key=request.api_key,
            api_key_encrypted=False,
            base_url=request.base_url,
            is_active=True,
            is_cloud_proxy=request.is_cloud_proxy or False,
            user_id=user_id
        )
        
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

    async def test_voice_connection(self, session: AsyncSession, connection_id: str, user_id: str) -> VoiceConnectionTestResult:
        """Test a voice connection by making actual API calls"""
        if connection_id == "chatsparty-default-voice" and settings.chatsparty_default_voice_enabled:
            voice_connection_entity = self._create_virtual_default_voice_entity(user_id)
            
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
        
        stmt = select(VoiceConnection).where(
            VoiceConnection.id == connection_id,
            VoiceConnection.user_id == user_id
        )
        result = await session.exec(stmt)
        connection = result.first()
            
        
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
            is_default=False,
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
    
    def _create_virtual_default_voice_connection(self) -> VoiceConnectionResponse:
        """Create the virtual ChatsParty default voice connection"""
        now = datetime.now(timezone.utc)
        return VoiceConnectionResponse(
            id="chatsparty-default-voice",
            name="ChatsParty Default Voice",
            description=f"Default ChatsParty voice connection with {settings.chatsparty_default_voice_provider}",
            provider=settings.chatsparty_default_voice_provider,
            provider_type="tts",
            voice_id=settings.chatsparty_default_voice_id,
            speed=1.0,
            pitch=1.0,
            stability=0.75,
            clarity=0.8,
            style="conversational",
            api_key_encrypted=bool(settings.chatsparty_default_voice_api_key),
            is_active=True,
            is_cloud_proxy=False,
            is_default=True,
            user_id="system",
            created_at=now,
            updated_at=now
        )
    
    def _create_virtual_default_voice_entity(self, user_id: str) -> VoiceConnectionEntity:
        """Create the virtual ChatsParty default voice entity for testing"""
        return VoiceConnectionEntity(
            id="chatsparty-default-voice",
            name="ChatsParty Default Voice",
            description=f"Default ChatsParty voice connection with {settings.chatsparty_default_voice_provider}",
            provider=settings.chatsparty_default_voice_provider,
            provider_type="tts",
            voice_id=settings.chatsparty_default_voice_id,
            speed=1.0,
            pitch=1.0,
            stability=0.75,
            clarity=0.8,
            style="conversational",
            api_key=settings.chatsparty_default_voice_api_key,
            api_key_encrypted=False,
            base_url=settings.chatsparty_default_voice_base_url,
            is_active=True,
            is_cloud_proxy=False,
            user_id=user_id
        )
    
    async def create_default_voice_connections_for_user(self, session: AsyncSession, user_id: str):
        """Create default voice connections for a new user"""
        default_voice_connections = []
        
        if settings.chatsparty_default_voice_enabled:
            pass
        
        default_voice_connections.extend([
            {
                "name": "ElevenLabs - Sarah",
                "description": "Natural conversational voice",
                "provider": "elevenlabs",
                "provider_type": "tts",
                "voice_id": "EXAVITQu4vr4xnSDxMaL",
                "speed": 1.0,
                "pitch": 1.0,
                "stability": 0.75,
                "clarity": 0.8,
                "style": "conversational"
            },
            {
                "name": "OpenAI - Alloy",
                "description": "OpenAI's alloy voice",
                "provider": "openai",
                "provider_type": "tts",
                "voice_id": "alloy",
                "speed": 1.0,
                "pitch": 1.0
            }
        ])
        
        for conn_data in default_voice_connections:
            try:
                request = VoiceConnectionCreateRequest(**conn_data)
                await self.create_voice_connection(session, request, user_id)
            except Exception as e:
                print(f"Failed to create default voice connection: {e}")
    
    async def get_available_voices(self, session: AsyncSession, connection_id: str, user_id: str) -> List[VoiceOption]:
        """Get available voices for a voice connection"""
        if connection_id == "chatsparty-default-voice" and settings.chatsparty_default_voice_enabled:
            voice_connection_entity = self._create_virtual_default_voice_entity(user_id)
        else:
            stmt = select(VoiceConnection).where(
                VoiceConnection.id == connection_id,
                VoiceConnection.user_id == user_id
            )
            result = await session.exec(stmt)
            connection = result.first()
            
            if not connection:
                return []
            
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
        
        try:
            provider = self.voice_service.providers.get(voice_connection_entity.provider.lower())
            if not provider:
                logger.error(f"Provider not found: {voice_connection_entity.provider}")
                return []
            
            logger.info(f"Getting voices from provider: {voice_connection_entity.provider}")
            voice_data = await provider.get_available_voices(voice_connection_entity)
            logger.info(f"Received {len(voice_data)} voices from provider")
            
            voices = []
            for voice in voice_data:
                voices.append(VoiceOption(
                    id=voice.get("id", ""),
                    name=voice.get("name", ""),
                    description=voice.get("description", ""),
                    category=voice.get("category", voice.get("voice_type", "standard")),
                    gender=voice.get("gender"),
                    age=voice.get("age"),
                    accent=voice.get("accent"),
                    preview_url=voice.get("preview_url"),
                    available_for_tiers=voice.get("available_for_tiers", [])
                ))
            
            return voices
            
        except Exception as e:
            print(f"Failed to get available voices: {e}")
            return []


voice_connection_service = VoiceConnectionService()