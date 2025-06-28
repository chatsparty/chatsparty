import logging

logger = logging.getLogger(__name__)

def get_vm_service():
    """Factory function to get the VM service using abstract provider system"""
    logger.info(f"[VM_FACTORY] Initializing VM service using abstract provider")
    
    try:
        from .vm import vm_factory
        logger.info(f"[VM_FACTORY] ✅ Successfully loaded abstract VM provider system")
        service = vm_factory.get_vm_service()
        logger.info(f"[VM_FACTORY] VM service instance created")
        return service
    except ImportError as e:
        logger.error(f"[VM_FACTORY] ❌ Failed to import abstract VM service: {e}")
        # Fallback to direct Docker service for backward compatibility
        try:
            from .docker.docker_facade import DockerFacade
            logger.warning(f"[VM_FACTORY] Falling back to direct Docker service")
            service = DockerFacade()
            return service
        except ImportError as fallback_e:
            logger.error(f"[VM_FACTORY] ❌ Fallback also failed: {fallback_e}")
            raise

__all__ = ['get_vm_service']