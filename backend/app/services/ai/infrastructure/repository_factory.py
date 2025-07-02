from contextlib import contextmanager
from ....core.database import get_sync_db_session, db_manager
from ...conversations.repositories import DatabaseConversationRepository
from .connection_repository import DatabaseConnectionRepository


class RepositoryFactory:
    """Factory for creating repositories - Used by legacy connection service"""
    _conversation_repo = None
    _connection_repo = None
    
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