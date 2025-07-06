"""Base repository class for all repositories."""

from abc import ABC
from sqlmodel.ext.asyncio.session import AsyncSession


class BaseRepository(ABC):
    """Base repository providing common database operations."""
    
    def __init__(self, db_session: AsyncSession):
        """Initialize with database session."""
        self.db_session = db_session
    
    async def refresh(self, instance):
        """Refresh an instance from the database."""
        await self.db_session.refresh(instance)