from dotenv import load_dotenv
load_dotenv()

from app.core.config import create_app
from app.routers import auth, health

# Create app without lifespan for testing
app = create_app()

app.include_router(health.router)
app.include_router(auth.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)