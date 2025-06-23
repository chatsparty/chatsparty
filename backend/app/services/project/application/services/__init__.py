"""
Project services package
"""

from .project_orchestrator_service import ProjectOrchestratorService

ProjectService = ProjectOrchestratorService

__all__ = [
    "ProjectService",
    "ProjectOrchestratorService"
]