from .routers import (
    auth,
    chat,
    connections,
    credit,
    files,
    health,
    mcp,
    podcast,
    system,
    voice_connections,
)
from .routers.projects import router as projects_router
from .core.database import db_manager
from .core.config import create_app
from contextlib import asynccontextmanager
from .services.websocket_service import websocket_service
from .routers import chat_socketio

from dotenv import load_dotenv
import logging
import signal
import sys
import asyncio

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@asynccontextmanager
async def lifespan(app):
    try:
        await db_manager.create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️ Database table creation failed: {e}")
    
    
    try:
        from .services.docker.background_port_service import get_background_port_service
        get_background_port_service()
        print("✅ Background port service started successfully")
    except Exception as e:
        print(f"⚠️ Background port service startup failed: {e}")
    
    yield
    
    
    try:
        from .services.docker.background_port_service import shutdown_background_port_service
        await shutdown_background_port_service()
        print("✅ Background port service stopped successfully")
    except Exception as e:
        print(f"⚠️ Background port service shutdown failed: {e}")
    
    try:
        await db_manager.close()
    except Exception as e:
        print(f"⚠️ Database cleanup failed: {e}")


app = create_app(lifespan=lifespan)

app.mount("/socket.io", websocket_service.get_socketio_app())

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(system.router)
app.include_router(projects_router)
app.include_router(chat.router)
app.include_router(connections.router)
app.include_router(voice_connections.router)
app.include_router(podcast.router)
app.include_router(files.router)
app.include_router(mcp.router)
from .core.config import settings

if settings.enable_credits:
    app.include_router(credit.router)
    
    from .services.credit.application.credit_service import InsufficientCreditsError
    from .middleware.credit_middleware import credit_exception_handler
    
    app.add_exception_handler(InsufficientCreditsError, credit_exception_handler)


def signal_handler(signum):
    print(f"\n🔌 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
