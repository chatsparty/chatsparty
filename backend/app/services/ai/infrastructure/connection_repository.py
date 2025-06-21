from typing import List, Optional
from sqlalchemy.orm import Session

from ....models.database import Connection as ConnectionModel
from .base_repository import BaseRepository
from ...crypto_service import crypto_service


class DatabaseConnectionRepository(BaseRepository):
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create_connection(self, connection_data: dict) -> dict:
        api_key = connection_data.get("api_key")
        
        if api_key is not None and api_key != "":
            encrypted_api_key = crypto_service.encrypt(api_key)
            api_key_encrypted = True
        else:
            encrypted_api_key = api_key
            api_key_encrypted = False
        
        db_connection = ConnectionModel(
            id=connection_data["id"],
            name=connection_data["name"],
            description=connection_data.get("description"),
            provider=connection_data["provider"],
            model_name=connection_data["model_name"],
            api_key=encrypted_api_key,
            api_key_encrypted=api_key_encrypted,
            base_url=connection_data.get("base_url"),
            is_active=connection_data.get("is_active", True),
            user_id=connection_data["user_id"]
        )
        
        self.db_session.add(db_connection)
        return self._to_dict(db_connection)
    
    def get_connection(self, connection_id: str, user_id: str = None) -> Optional[dict]:
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connection = query.first()
        
        if not db_connection:
            return None
        
        return self._to_dict(db_connection)
    
    def get_all_connections(self, user_id: str = None) -> List[dict]:
        query = self.db_session.query(ConnectionModel)
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connections = query.all()
        return [self._to_dict(conn) for conn in db_connections]
    
    def get_active_connections(self, user_id: str = None) -> List[dict]:
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.is_active == True
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connections = query.all()
        return [self._to_dict(conn) for conn in db_connections]
    
    def update_connection(self, connection_id: str, update_data: dict, user_id: str = None) -> Optional[dict]:
        query = self.db_session.query(ConnectionModel).filter(
            ConnectionModel.id == connection_id
        )
        
        if user_id:
            query = query.filter(ConnectionModel.user_id == user_id)
        
        db_connection = query.first()
        
        if not db_connection:
            return None
        
        if "api_key" in update_data:
            api_key = update_data.pop("api_key")
            if api_key is not None and api_key != "":
                encrypted_api_key = crypto_service.encrypt(api_key)
                db_connection.api_key = encrypted_api_key
                db_connection.api_key_encrypted = True
            else:
                db_connection.api_key = api_key
                db_connection.api_key_encrypted = False
        
        for field, value in update_data.items():
            if hasattr(db_connection, field) and field != "api_key_encrypted":
                setattr(db_connection, field, value)
        
        return self._to_dict(db_connection)
    
    def delete_connection(self, connection_id: str, user_id: str = None) -> bool:
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
    
    def _to_dict(self, db_connection: ConnectionModel) -> dict:
        from datetime import datetime
        
        if not hasattr(db_connection, 'created_at') or db_connection.created_at is None:
            self.db_session.flush()
        
        api_key = db_connection.api_key
        if api_key and getattr(db_connection, 'api_key_encrypted', False):
            try:
                api_key = crypto_service.decrypt(api_key)
            except Exception as e:
                print(f"Warning: Failed to decrypt API key for connection {db_connection.id}: {e}")
                api_key = None
        
        return {
            "id": db_connection.id,
            "name": db_connection.name,
            "description": db_connection.description,
            "provider": db_connection.provider,
            "model_name": db_connection.model_name,
            "api_key": api_key,
            "base_url": db_connection.base_url,
            "is_active": db_connection.is_active,
            "user_id": db_connection.user_id,
            "created_at": db_connection.created_at.isoformat() if db_connection.created_at else datetime.utcnow().isoformat(),
            "updated_at": db_connection.updated_at.isoformat() if db_connection.updated_at else datetime.utcnow().isoformat(),
        }