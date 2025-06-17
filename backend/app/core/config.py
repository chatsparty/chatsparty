import os
from typing import Optional
from pydantic_settings import BaseSettings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


class Settings(BaseSettings):
    database_url: Optional[str] = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = "password"
    postgres_db: str = "chatsparty"
    sqlite_db_path: str = "chatsparty.db"
    use_sqlite: bool = True
    ollama_model: str = "gemma3:4b"
    
    @property
    def database_url_computed(self) -> str:
        if self.database_url:
            return self.database_url
        
        if self.use_sqlite:
            return f"sqlite+aiosqlite:///{self.sqlite_db_path}"
        else:
            return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        env_file = ".env"


settings = Settings()


def create_app(lifespan=None) -> FastAPI:
    app = FastAPI(title="Wisty AI API", version="1.0.0", lifespan=lifespan)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app