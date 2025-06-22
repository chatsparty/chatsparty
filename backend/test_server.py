from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Test server working"}

@app.get("/auth/config")
async def auth_config():
    return {"social_auth_only": False, "google_enabled": True, "github_enabled": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)