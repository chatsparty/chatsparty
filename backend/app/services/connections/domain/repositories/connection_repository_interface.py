"""Repository interface for connections."""

from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities import Connection


class ConnectionRepositoryInterface(ABC):
    """Abstract interface for connection repository."""
    
    @abstractmethod
    def create(self, connection: Connection) -> Connection:
        """Create a new connection."""
        pass
    
    @abstractmethod
    def get_by_id(self, connection_id: str, user_id: Optional[str] = None) -> Optional[Connection]:
        """Get a connection by ID."""
        pass
    
    @abstractmethod
    def get_all(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all connections."""
        pass
    
    @abstractmethod
    def get_active(self, user_id: Optional[str] = None) -> List[Connection]:
        """Get all active connections."""
        pass
    
    @abstractmethod
    def update(self, connection: Connection) -> Connection:
        """Update an existing connection."""
        pass
    
    @abstractmethod
    def delete(self, connection_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a connection."""
        pass