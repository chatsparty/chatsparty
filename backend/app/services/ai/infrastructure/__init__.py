"""
AI Infrastructure - Legacy components

This module contains infrastructure components that are still used by
other services (like connection_service) but will eventually be migrated
to appropriate modules.

Components kept for backward compatibility:
- database_repositories: Repository factory for connections
- connection_repository: Connection data access
- session_manager: Database session management 
"""

from .database_repositories import RepositoryFactory
from .connection_repository import DatabaseConnectionRepository
from .session_manager import SessionManager

# Re-export legacy model services for backward compatibility
from ...models.unified_model_service import get_initialized_unified_model_service

__all__ = [
    "RepositoryFactory",
    "DatabaseConnectionRepository", 
    "SessionManager",
    "get_initialized_unified_model_service"
]