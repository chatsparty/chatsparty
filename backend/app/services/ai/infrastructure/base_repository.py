from abc import ABC
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError


class BaseRepository(ABC):
    """Base repository class providing common database functionality"""
    
    def __init__(self, db_session: Session):
        self.db_session = db_session
    
    def commit(self) -> None:
        """Commit the current transaction"""
        try:
            self.db_session.commit()
        except SQLAlchemyError:
            self.db_session.rollback()
            raise
    
    def rollback(self) -> None:
        """Rollback the current transaction"""
        self.db_session.rollback()
    
    def flush(self) -> None:
        """Flush pending changes to the database"""
        try:
            self.db_session.flush()
        except SQLAlchemyError:
            self.db_session.rollback()
            raise
    
    def close(self) -> None:
        """Close the database session"""
        self.db_session.close()
    
    def safe_execute(self, operation):
        """Execute an operation with proper error handling"""
        try:
            result = operation()
            return result
        except SQLAlchemyError:
            self.db_session.rollback()
            raise