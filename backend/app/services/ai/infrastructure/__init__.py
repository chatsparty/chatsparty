"""
AI Infrastructure - LangChain components

This module contains minimal infrastructure components.
Most infrastructure has been moved to appropriate domain modules.
"""

# Re-export LangChain model services
from ...models.langchain_model_service import get_initialized_langchain_model_service

__all__ = [
    "get_initialized_langchain_model_service"
]