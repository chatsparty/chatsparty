from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from .config import settings


class DatabaseManager:
    def __init__(self):
        # Create async engine for all database operations
        self.engine = create_async_engine(
            settings.database_url_computed,
            echo=False,
            future=True,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600
        )
    
    async def create_tables(self):
        """Create tables asynchronously"""
        async with self.engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    
    async def close(self):
        """Close async engine"""
        await self.engine.dispose()
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get an async database session with proper transaction handling"""
        async with AsyncSession(self.engine) as session:
            yield session
            # SQLModel/SQLAlchemy will auto-commit on context exit if needed


db_manager = DatabaseManager()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session for dependency injection"""
    async with db_manager.get_session() as session:
        yield session