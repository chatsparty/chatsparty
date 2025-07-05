"""Base repository class for all repositories."""

from abc import ABC
from sqlmodel import Session
from sqlalchemy.exc import SQLAlchemyError


class BaseRepository(ABC):
    """Base repository providing common database operations."""
    
    def __init__(self, db_session: Session):
        """Initialize with database session."""
        self.db_session = db_session
    
    def commit(self):
        """Commit the current transaction."""
        try:
            self.db_session.commit()
        except SQLAlchemyError:
            self.db_session.rollback()
            raise
    
    def rollback(self):
        """Rollback the current transaction."""
        self.db_session.rollback()
    
    def flush(self):
        """Flush pending changes to the database."""
        self.db_session.flush()
    
    def refresh(self, instance):
        """Refresh an instance from the database."""
        self.db_session.refresh(instance)
    
    async def safe_execute(self, func, *args, **kwargs):
        """Execute a function with automatic rollback on error."""
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception:
            self.rollback()
            raise