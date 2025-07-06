from abc import ABC
from sqlmodel import Session


class BaseRepository(ABC):
    """Base repository class providing common database functionality"""
    
    def __init__(self, db_session: Session):
        self.db_session = db_session