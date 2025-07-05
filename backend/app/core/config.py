from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings


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
    
    # Google Vertex AI Configuration
    google_cloud_project: Optional[str] = None
    vertex_ai_location: str = "us-central1"
    google_application_credentials: Optional[str] = None
    
    # CORS and development settings
    cors_allow_all_origins: bool = True  # Set to False in production
    development_mode: bool = True  # Set to False in production
    
    chatsparty_default_enabled: bool = True
    chatsparty_default_provider: str = "vertex_ai"  # Can be: chatsparty, vertex_ai, gemini, etc.
    chatsparty_default_model: str = "gemini-2.5-flash"
    chatsparty_default_api_key: Optional[str] = None
    chatsparty_default_base_url: Optional[str] = None
    
    chatsparty_default_voice_enabled: bool = True
    chatsparty_default_voice_provider: str = "elevenlabs"
    chatsparty_default_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    chatsparty_default_voice_api_key: Optional[str] = None
    chatsparty_default_voice_base_url: Optional[str] = None
    
    vm_provider: str = "docker"
    docker_image: str = "wisty-dev-capsule"
    
    enable_credits: bool = False
    docker_mode: str = "local"
    vm_workspace_enabled: bool = False
    enable_projects: bool = False

    secret_key: str = "your-secret-key-change-this-in-production-make-it-32-chars-long"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    encryption_master_key: Optional[str] = None

    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    frontend_url: Optional[str] = None
    backend_url: str = "http://localhost:8000"

    @property
    def google_redirect_uri(self) -> str:
        return f"{self.frontend_url}/auth/callback/google"

    @property
    def github_redirect_uri(self) -> str:
        return f"{self.frontend_url}/auth/callback/github"

    social_auth_only: bool = False

    hide_db_errors: bool = True
    debug_mode: bool = False

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


def get_settings(env_file_path: str = ".env") -> Settings:
    """Get settings with custom environment file"""
    class DynamicSettings(Settings):
        class Config:
            env_file = env_file_path

    return DynamicSettings()


settings = Settings()


def create_app(lifespan=None) -> FastAPI:
    app = FastAPI(title="ChatsParty API", version="1.0.0", lifespan=lifespan)
    
    # Configure CORS based on environment
    if settings.cors_allow_all_origins or settings.development_mode:
        # Allow all origins in development
        allowed_origins = ["*"]
    else:
        # Restrict origins in production
        allowed_origins = [
            settings.frontend_url] if settings.frontend_url else ["http://localhost:5173", "http://localhost:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
