from .docker_facade import DockerFacade

# For backward compatibility with E2B interface
DockerService = DockerFacade

__all__ = ['DockerService', 'DockerFacade']