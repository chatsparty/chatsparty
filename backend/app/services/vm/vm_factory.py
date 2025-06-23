import os
import logging
from typing import Type

from .interfaces.vm_provider import VMProviderInterface
from .implementations.docker_provider import DockerProvider
from .implementations.fly_provider import FlyProvider

logger = logging.getLogger(__name__)


class VMProviderFactory:
    """Factory for creating VM provider instances"""
    
    _providers = {
        "docker": DockerProvider,
        "fly": FlyProvider,
    }

    @classmethod
    def create_provider(cls, provider_type: str = None) -> VMProviderInterface:
        """
        Create a VM provider instance based on provider type
        
        Args:
            provider_type: Type of provider ("docker", "fly"). 
                          If None, uses VM_PROVIDER environment variable, 
                          defaults to "docker"
        
        Returns:
            VMProviderInterface instance
            
        Raises:
            ValueError: If provider type is not supported
        """
        if provider_type is None:
            provider_type = os.getenv("VM_PROVIDER", "docker").lower()
        
        provider_type = provider_type.lower()
        
        if provider_type not in cls._providers:
            available = ", ".join(cls._providers.keys())
            raise ValueError(
                f"Unsupported VM provider: {provider_type}. "
                f"Available providers: {available}"
            )
        
        provider_class = cls._providers[provider_type]
        
        try:
            instance = provider_class()
            logger.info(f"[VM_FACTORY] Successfully created {provider_type} provider")
            return instance
        except Exception as e:
            logger.error(f"[VM_FACTORY] Failed to create {provider_type} provider: {e}")
            raise

    @classmethod
    def get_available_providers(cls) -> list[str]:
        """Get list of available provider types"""
        return list(cls._providers.keys())

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[VMProviderInterface]):
        """
        Register a new provider type
        
        Args:
            name: Provider name
            provider_class: Provider class that implements VMProviderInterface
        """
        if not issubclass(provider_class, VMProviderInterface):
            raise ValueError(
                f"Provider class must implement VMProviderInterface"
            )
        
        cls._providers[name.lower()] = provider_class
        logger.info(f"[VM_FACTORY] Registered new provider: {name}")


# Global singleton instance
_vm_service_instance = None

def get_vm_service(provider_type: str = None) -> VMProviderInterface:
    """
    Convenience function to get a VM service instance (singleton)
    
    Args:
        provider_type: VM provider type ("docker", "fly")
        
    Returns:
        VMProviderInterface instance (singleton)
    """
    global _vm_service_instance
    
    if _vm_service_instance is None:
        _vm_service_instance = VMProviderFactory.create_provider(provider_type)
        logger.info(f"[VM_FACTORY] Created singleton VM service instance")
    
    return _vm_service_instance