"""Database implementation of connection repository."""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from .....models.database import Connection as ConnectionModel
from ....shared.base_repository import BaseRepository
from ...domain.entities import Connection
from ...domain.repositories import ConnectionRepositoryInterface
from ...domain.services import EncryptionService
from ...domain.value_objects import EncryptedApiKey


class DatabaseConnectionRepository(BaseRepository, ConnectionRepositoryInterface):
    """Database implementation of connection repository."""
    
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create(self, connection: Connection) -> Connection:
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
        self.db_session.flush()
        
        return self._to_domain_entity(db_connection)
    
    def get_by_id(self, connection_id: str, user_id: Optional[str] = None) -> Optional[Connection]:
        """Get a connection by ID."""
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connection = query.first()
        
        if not db_connection:
            return None
        
        return self._to_domain_entity(db_connection)
    
    def get_all(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all connections."""
        query = self.db_session.query(ConnectionModel)
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connections = query.all()
        return [self._to_domain_entity(conn) for conn in db_connections]
    
    def get_active(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all active connections."""
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.is_active == True
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connections = query.all()
        return [self._to_domain_entity(conn) for conn in db_connections]
    
    def update(self, connection: Connection) -> Connection:
        """Update an existing connection."""
        db_connection = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.id == connection.id
        ).first()
        
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
        
        self.db_session.flush()
        
        return self._to_domain_entity(db_connection)
    
    def delete(self, connection_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a connection."""
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connection = query.first()
        
        if not db_connection:
            return False
        
        self.db_session.delete(db_connection)
        return True
    
    def _to_domain_entity(self, db_connection: ConnectionModel) -> Connection:
        """Convert database model to domain entity."""
        # Ensure timestamps are available
        if not hasattr(db_connection, 'created_at') or db_connection.created_at is None:
            self.db_session.flush()
        
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
            created_at=db_connection.created_at or datetime.utcnow(),
            updated_at=db_connection.updated_at or datetime.utcnow()
        )