from contextlib import asynccontextmanager
from .core.config import create_app
from .core.database import db_manager
from .routers import health, chat, connections


@asynccontextmanager
async def lifespan(app):
    # Startup
    await db_manager.create_tables()
    yield
    # Shutdown
    await db_manager.close()


app = create_app(lifespan=lifespan)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(connections.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)