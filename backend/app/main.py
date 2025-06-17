from .core.config import create_app
from .routers import health, chat

app = create_app()

app.include_router(health.router)
app.include_router(chat.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)