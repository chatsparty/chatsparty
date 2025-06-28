"""
Project routers package
"""

from fastapi import APIRouter

from .core import router as core_router
from .files import router as files_router
from .monitoring import router as monitoring_router
from .vm import router as vm_router
from .ide import router as ide_router
from .storage import router as storage_router
from .conversations import router as conversations_router

router = APIRouter()

router.include_router(core_router)
router.include_router(vm_router)
# router.include_router(files_router)  # Disabled - conflicts with storage router
router.include_router(monitoring_router)
router.include_router(ide_router)
router.include_router(storage_router)
router.include_router(conversations_router)

__all__ = ["router"]