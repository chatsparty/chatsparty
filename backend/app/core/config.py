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
    openrouter_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    
    # Authentication settings
    secret_key: str = "your-secret-key-change-this-in-production-make-it-32-chars-long"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Encryption settings
    encryption_master_key: Optional[str] = None
    
    # OAuth settings
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    frontend_url: Optional[str] = None
    backend_url: str = "http://localhost:8000"
    
    # OAuth redirect URIs (constructed from backend_url)
    @property
    def google_redirect_uri(self) -> str:
        return f"{self.frontend_url}/auth/google/callback"
    
    @property
    def github_redirect_uri(self) -> str:
        return f"{self.frontend_url}/auth/github/callback"
    
    # Authentication mode settings
    # Set to true to disable traditional email/password auth (cloud mode)
    social_auth_only: bool = False
    
    # Error handling settings
    # Set to true to hide detailed database errors in production
    hide_db_errors: bool = True
    debug_mode: bool = False
    
    # Storage settings
    storage_provider: str = "local"
    local_storage_path: str = "./storage/uploads"
    local_storage_url_base: str = "http://localhost:8000/files/download"
    
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


# Support dynamic environment file loading
def get_settings(env_file_path: str = ".env") -> Settings:
    """Get settings with custom environment file"""
    class DynamicSettings(Settings):
        class Config:
            env_file = env_file_path
    
    return DynamicSettings()


# Default settings instance
settings = Settings()


def create_app(lifespan=None) -> FastAPI:
    app = FastAPI(title="Wisty AI API", version="1.0.0", lifespan=lifespan)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app