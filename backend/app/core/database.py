from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import async_sessionmaker
from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator

from .config import settings


class DatabaseManager:
    def __init__(self):
        # Create async engine for SQLModel
        self.async_engine = create_async_engine(
            settings.database_url_computed,
            echo=False,
            future=True,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create sync engine for SQLModel
        sync_url = settings.database_url_computed.replace("+aiosqlite", "").replace("+asyncpg", "")
        
        if "prepared_statement_cache_size" in sync_url:
            import re
            sync_url = re.sub(r'[?&]prepared_statement_cache_size=\d+', '', sync_url)
            sync_url = sync_url.replace('??', '?').rstrip('?')
        
        if sync_url.startswith("postgresql://"):
            sync_url = sync_url.replace("postgresql://", "postgresql+psycopg2://")
        
        self.sync_engine = create_engine(
            sync_url,
            echo=False,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        self.sync_session_maker = sessionmaker(
            bind=self.sync_engine,
            class_=Session,
            expire_on_commit=False
        )
    
    async def create_tables(self):
        # SQLModel uses metadata from SQLModel base
        async with self.async_engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    
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