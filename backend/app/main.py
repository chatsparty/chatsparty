from .routers import (
    auth,
    chat,
    connections,
    files,
    health,
    mcp,
    podcast,
    terminal,
    voice_connections,
    websocket,
)
from .routers.projects import router as projects_router
from .core.database import db_manager
from .core.config import create_app
from contextlib import asynccontextmanager

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
    
    # Start terminal manager
    try:
        from .services.terminal.terminal_manager import terminal_manager
        await terminal_manager.start()
        print("✅ Terminal manager started successfully")
    except Exception as e:
        print(f"⚠️ Terminal manager startup failed: {e}")
    
    yield
    
    # Stop terminal manager
    try:
        from .services.terminal.terminal_manager import terminal_manager
        # Give terminal manager limited time to clean up
        await asyncio.wait_for(terminal_manager.stop(), timeout=5.0)
        print("✅ Terminal manager stopped successfully")
    except asyncio.TimeoutError:
        print("⚠️ Terminal manager shutdown timeout - forcing stop")
    except Exception as e:
        print(f"⚠️ Terminal manager shutdown failed: {e}")
    
    try:
        await db_manager.close()
    except Exception as e:
        print(f"⚠️ Database cleanup failed: {e}")


app = create_app(lifespan=lifespan)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects_router)
app.include_router(chat.router)
app.include_router(connections.router)
app.include_router(voice_connections.router)
app.include_router(podcast.router)
app.include_router(files.router)
app.include_router(mcp.router)
app.include_router(terminal.router, prefix="/api", tags=["terminal"])
app.include_router(websocket.router, tags=["websocket"])

def signal_handler(signum, frame):
    print(f"\n🔌 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
