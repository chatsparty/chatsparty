"""
Session management utilities for handling database sessions properly
"""
from contextlib import asynccontextmanager
from ...core.database import db_manager


class SessionManager:
    """Manages database sessions for repositories"""
    
    @staticmethod
    @asynccontextmanager
    async def create_session():
        """Create a database session with proper management"""
        async with db_manager.get_session() as session:
            yield session
    
    @staticmethod
    @asynccontextmanager
    async def get_agent_repository():
        """Get an agent repository with proper session management"""
        from ..agents.repositories import DatabaseAgentRepository
        
        async with db_manager.get_session() as session:
            repository = DatabaseAgentRepository(session)
            yield repository
    
    @staticmethod
    @asynccontextmanager
    async def get_conversation_repository():
        """Get a conversation repository with proper session management"""
        from ..conversations.repositories import DatabaseConversationRepository
        
        async with db_manager.get_session() as session:
            repository = DatabaseConversationRepository(session)
            yield repository