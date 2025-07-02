"""Connection entity representing an AI model connection."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Connection:
    """Domain entity representing an AI model connection."""
    
    id: str
    name: str
    provider: str
    model_name: str
    user_id: str
    is_active: bool = True
    description: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate connection after initialization."""
        if not self.name:
            raise ValueError("Connection name is required")
        if not self.provider:
            raise ValueError("Provider is required")
        if not self.model_name:
            raise ValueError("Model name is required")
        if not self.user_id:
            raise ValueError("User ID is required")
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "provider": self.provider,
            "model_name": self.model_name,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @staticmethod
    def from_dict(data: dict) -> "Connection":
        """Create entity from dictionary."""
        created_at = data.get("created_at")
        updated_at = data.get("updated_at")
        
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        return Connection(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            provider=data["provider"],
            model_name=data["model_name"],
            api_key=data.get("api_key"),
            base_url=data.get("base_url"),
            is_active=data.get("is_active", True),
            is_default=data.get("is_default", False),
            user_id=data["user_id"],
            created_at=created_at,
            updated_at=updated_at
        )