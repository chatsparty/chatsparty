"""
Connections module for managing AI model connections.

This module follows clean architecture principles:
- Domain: Core business logic and entities
- Application: Use cases and orchestration
- Infrastructure: External dependencies and data persistence
"""

from .application.connection_service import connection_service

__all__ = ["connection_service"]