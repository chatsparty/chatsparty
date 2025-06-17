from contextlib import contextmanager
from ....core.database import get_sync_db_session, db_manager
from .agent_repository import DatabaseAgentRepository
from .conversation_repository import DatabaseConversationRepository
from .connection_repository import DatabaseConnectionRepository


class RepositoryFactory:
    _agent_repo = None
    _conversation_repo = None
    _connection_repo = None
    
    @staticmethod
    def create_agent_repository() -> DatabaseAgentRepository:
        # Use a singleton pattern with session refresh on errors
        if RepositoryFactory._agent_repo is None:
            session = db_manager.sync_session_maker()
            RepositoryFactory._agent_repo = DatabaseAgentRepository(session)
        return RepositoryFactory._agent_repo
    
    @staticmethod
    def create_conversation_repository() -> DatabaseConversationRepository:
        if RepositoryFactory._conversation_repo is None:
            session = db_manager.sync_session_maker()
            RepositoryFactory._conversation_repo = DatabaseConversationRepository(session)
        return RepositoryFactory._conversation_repo
    
    @staticmethod
    def create_connection_repository() -> DatabaseConnectionRepository:
        if RepositoryFactory._connection_repo is None:
            session = db_manager.sync_session_maker()
            RepositoryFactory._connection_repo = DatabaseConnectionRepository(session)
        return RepositoryFactory._connection_repo
    
    @staticmethod
    def refresh_agent_repository():
        """Create a fresh agent repository with a new session"""
        session = db_manager.sync_session_maker()
        RepositoryFactory._agent_repo = DatabaseAgentRepository(session)
        return RepositoryFactory._agent_repo
    
    @staticmethod
    @contextmanager
    def create_agent_repository_with_session():
        """Create a repository with proper session management"""
        with db_manager.get_sync_session() as session:
            yield DatabaseAgentRepository(session)
    
    @staticmethod
    @contextmanager
    def create_conversation_repository_with_session():
        """Create a repository with proper session management"""
        with db_manager.get_sync_session() as session:
            yield DatabaseConversationRepository(session)
    
    @staticmethod
    @contextmanager
    def create_connection_repository_with_session():
        """Create a repository with proper session management"""
        with db_manager.get_sync_session() as session:
            yield DatabaseConnectionRepository(session)