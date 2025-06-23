"""
Project routers package
"""

from fastapi import APIRouter

from .core import router as core_router
from .files import router as files_router
from .monitoring import router as monitoring_router
from .vm import router as vm_router

router = APIRouter()

router.include_router(core_router)
router.include_router(vm_router)
router.include_router(files_router)
router.include_router(monitoring_router)

__all__ = ["router"]