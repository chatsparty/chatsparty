import logging

logger = logging.getLogger(__name__)

def get_vm_service():
    """Factory function to get the Docker VM service"""
    logger.info(f"[VM_FACTORY] Initializing Docker VM service")
    
    try:
        from .docker import DockerService
        logger.info(f"[VM_FACTORY] ✅ Successfully loaded Docker VM provider")
        service = DockerService()
        logger.info(f"[VM_FACTORY] Docker service instance created")
        return service
    except ImportError as e:
        logger.error(f"[VM_FACTORY] ❌ Failed to import Docker service: {e}")
        raise

__all__ = ['get_vm_service']