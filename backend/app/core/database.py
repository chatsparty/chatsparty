from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator

from .config import settings


class Base(DeclarativeBase):
    pass


class DatabaseManager:
    def __init__(self):
        # Async engine for async operations
        self.async_engine = create_async_engine(
            settings.database_url_computed,
            echo=False,
            future=True
        )
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Sync engine for sync operations
        sync_url = settings.database_url_computed.replace("+aiosqlite", "").replace("+asyncpg", "")
        # For PostgreSQL, use psycopg2 driver
        if sync_url.startswith("postgresql://"):
            sync_url = sync_url.replace("postgresql://", "postgresql+psycopg2://")
        self.sync_engine = create_engine(sync_url, echo=False, future=True)
        self.sync_session_maker = sessionmaker(
            bind=self.sync_engine,
            class_=Session,
            expire_on_commit=False
        )
    
    async def create_tables(self):
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def close(self):
        await self.async_engine.dispose()
        self.sync_engine.dispose()
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    @contextmanager
    def get_sync_session(self) -> Generator[Session, None, None]:
        session = self.sync_session_maker()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


db_manager = DatabaseManager()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.get_async_session() as session:
        yield session


def get_sync_db_session() -> Generator[Session, None, None]:
    with db_manager.get_sync_session() as session:
        yield session