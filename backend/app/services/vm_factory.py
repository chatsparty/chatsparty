import os
import logging

logger = logging.getLogger(__name__)

def get_vm_service():
    """Factory function to get the appropriate VM service based on configuration"""
    vm_provider = os.getenv('VM_PROVIDER', 'docker')  # default to docker
    
    logger.info(f"[VM_FACTORY] Initializing VM service with provider: {vm_provider}")
    logger.info(f"[VM_FACTORY] Available providers: docker, e2b")
    
    if vm_provider.lower() == 'docker':
        try:
            from .docker import DockerService
            logger.info(f"[VM_FACTORY] ✅ Successfully loaded Docker VM provider")
            service = DockerService()
            logger.info(f"[VM_FACTORY] Docker service instance created")
            return service
        except ImportError as e:
            logger.error(f"[VM_FACTORY] ❌ Failed to import Docker service: {e}")
            raise
    elif vm_provider.lower() == 'e2b':
        try:
            from .e2b import E2BService
            logger.info(f"[VM_FACTORY] ✅ Successfully loaded E2B VM provider")
            service = E2BService()
            logger.info(f"[VM_FACTORY] E2B service instance created")
            return service
        except ImportError as e:
            logger.error(f"[VM_FACTORY] ❌ Failed to import E2B service: {e}")
            raise
    else:
        logger.error(f"[VM_FACTORY] ❌ Unknown VM provider: {vm_provider}")
        logger.error(f"[VM_FACTORY] Supported providers: docker, e2b")
        raise ValueError(f"Unknown VM provider: {vm_provider}")

__all__ = ['get_vm_service']