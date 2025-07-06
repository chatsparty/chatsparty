"""Database implementation of connection repository."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from .....models.database import Connection as ConnectionModel
from ....shared.base_repository import BaseRepository
from ...domain.entities import Connection
from ...domain.repositories import ConnectionRepositoryInterface
from ...domain.services import EncryptionService
from ...domain.value_objects import EncryptedApiKey


class DatabaseConnectionRepository(BaseRepository, ConnectionRepositoryInterface):
    """Database implementation of connection repository."""
    
    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)
    
    async def create(self, connection: Connection) -> Connection:
        """Create a new connection in the database."""
        # Encrypt API key if present
        encrypted_key = EncryptionService.encrypt_api_key(connection.api_key)
        
        db_connection = ConnectionModel(
            id=connection.id,
            name=connection.name,
            description=connection.description,
            provider=connection.provider,
            model_name=connection.model_name,
            api_key=encrypted_key.value,
            api_key_encrypted=encrypted_key.is_encrypted,
            base_url=connection.base_url,
            is_active=connection.is_active,
            user_id=connection.user_id
        )
        
        self.db_session.add(db_connection)
        await self.db_session.flush()
        
        return self._to_domain_entity(db_connection)
    
    async def get_by_id(self, connection_id: str, user_id: Optional[str] = None) -> Optional[Connection]:
        """Get a connection by ID."""
        stmt = select(ConnectionModel).where(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            stmt = stmt.where(ConnectionModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_connection = result.first()
        
        if not db_connection:
            return None
        
        return self._to_domain_entity(db_connection)
    
    async def get_all(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all connections."""
        stmt = select(ConnectionModel)
        
        if user_id:
            stmt = stmt.where(ConnectionModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_connections = result.all()
        return [self._to_domain_entity(conn) for conn in db_connections]
    
    async def get_active(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all active connections."""
        stmt = select(ConnectionModel).where(
            ConnectionModel.is_active == True
        )
        
        if user_id:
            stmt = stmt.where(ConnectionModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_connections = result.all()
        return [self._to_domain_entity(conn) for conn in db_connections]
    
    async def update(self, connection: Connection) -> Connection:
        """Update an existing connection."""
        stmt = select(ConnectionModel).where(
            ConnectionModel.id == connection.id
        )
        result = await self.db_session.exec(stmt)
        db_connection = result.first()
        
        if not db_connection:
            raise ValueError(f"Connection {connection.id} not found")
        
        # Update fields
        db_connection.name = connection.name
        db_connection.description = connection.description
        db_connection.provider = connection.provider
        db_connection.model_name = connection.model_name
        db_connection.base_url = connection.base_url
        db_connection.is_active = connection.is_active
        
        # Handle API key update
        if connection.api_key is not None:
            encrypted_key = EncryptionService.encrypt_api_key(connection.api_key)
            db_connection.api_key = encrypted_key.value
            db_connection.api_key_encrypted = encrypted_key.is_encrypted
        
        await self.db_session.flush()
        
        return self._to_domain_entity(db_connection)
    
    async def delete(self, connection_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a connection."""
        stmt = select(ConnectionModel).where(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            stmt = stmt.where(ConnectionModel.user_id == user_id)
        
        result = await self.db_session.exec(stmt)
        db_connection = result.first()
        
        if not db_connection:
            return False
        
        await self.db_session.delete(db_connection)
        return True
    
    def _to_domain_entity(self, db_connection: ConnectionModel) -> Connection:
        """Convert database model to domain entity."""
        # Note: Timestamps should already be available from the database
        # If not, they will use the default values below
        
        # Decrypt API key if needed
        api_key = None
        if db_connection.api_key:
            encrypted_key = EncryptedApiKey(
                value=db_connection.api_key,
                is_encrypted=getattr(db_connection, 'api_key_encrypted', False)
            )
            api_key = EncryptionService.decrypt_api_key(encrypted_key)
        
        return Connection(
            id=db_connection.id,
            name=db_connection.name,
            description=db_connection.description,
            provider=db_connection.provider,
            model_name=db_connection.model_name,
            api_key=api_key,
            base_url=db_connection.base_url,
            is_active=db_connection.is_active,
            user_id=db_connection.user_id,
            created_at=db_connection.created_at or datetime.now(timezone.utc),
            updated_at=db_connection.updated_at or datetime.now(timezone.utc)
        )