"""
AI Infrastructure - Legacy components

This module contains minimal infrastructure components.
Most infrastructure has been moved to appropriate domain modules.
"""

# Re-export legacy model services for backward compatibility
from ...models.unified_model_service import get_initialized_unified_model_service

__all__ = [
    "get_initialized_unified_model_service"
]