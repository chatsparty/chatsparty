"""
AI Services - Legacy Infrastructure Only

This module only contains legacy infrastructure components.
For AI services, use: from app.services.ai_service import get_ai_service

This module is kept only for backward compatibility with connection_service
and other infrastructure that hasn't been migrated yet.
"""

# This module intentionally does NOT export AIServiceFacade or get_ai_service
# to avoid circular imports. Use the new ai_service module instead:
# from app.services.ai_service import AIServiceFacade, get_ai_service

__all__ = []