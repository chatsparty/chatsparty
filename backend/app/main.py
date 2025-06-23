from .routers import (
    auth,
    chat,
    connections,
    files,
    health,
    mcp,
    podcast,
    voice_connections,
    websocket,
)
from .routers.projects import router as projects_router
from .core.database import db_manager
from .core.config import create_app
from contextlib import asynccontextmanager

from dotenv import load_dotenv
import logging

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
    yield
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
app.include_router(websocket.router, tags=["websocket"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
