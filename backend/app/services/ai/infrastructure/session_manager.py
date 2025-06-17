"""
Session management utilities for handling database sessions properly
"""
from contextlib import contextmanager
from sqlalchemy.exc import SQLAlchemyError
from ....core.database import db_manager
from .agent_repository import DatabaseAgentRepository
from .conversation_repository import DatabaseConversationRepository  
from .connection_repository import DatabaseConnectionRepository


class SessionManager:
    """Manages database sessions for repositories"""
    
    @staticmethod
    @contextmanager
    def get_agent_repository():
        """Get an agent repository with proper session management"""
        session = db_manager.sync_session_maker()
        repository = DatabaseAgentRepository(session)
        try:
            yield repository
            session.commit()
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()
    
    @staticmethod
    @contextmanager
    def get_conversation_repository():
        """Get a conversation repository with proper session management"""
        session = db_manager.sync_session_maker()
        repository = DatabaseConversationRepository(session)
        try:
            yield repository
            session.commit()
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()
    
    @staticmethod
    @contextmanager
    def get_connection_repository():
        """Get a connection repository with proper session management"""
        session = db_manager.sync_session_maker()
        repository = DatabaseConnectionRepository(session)
        try:
            yield repository
            session.commit()
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()