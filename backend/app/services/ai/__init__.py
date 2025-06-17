from .ai_service_facade import AIServiceFacade

# Create a singleton instance with proper session management
_ai_service_facade = None

def get_ai_service() -> AIServiceFacade:
    global _ai_service_facade
    if _ai_service_facade is None:
        _ai_service_facade = AIServiceFacade()
    return _ai_service_facade

__all__ = ["AIServiceFacade", "get_ai_service"]