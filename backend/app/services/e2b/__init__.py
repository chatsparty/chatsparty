"""E2B Service Module"""

from .e2b_facade import E2BFacade

# For backward compatibility, create an alias
E2BService = E2BFacade

# Create a singleton instance
_e2b_service_instance = None

def get_e2b_service() -> E2BFacade:
    """Get singleton instance of E2B service"""
    global _e2b_service_instance
    if _e2b_service_instance is None:
        _e2b_service_instance = E2BFacade()
    return _e2b_service_instance

__all__ = ["E2BService", "E2BFacade", "get_e2b_service"]
