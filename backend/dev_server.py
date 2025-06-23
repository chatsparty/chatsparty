#!/usr/bin/env python3
"""
Development server script with proper environment loading
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting development server with environment loaded...")
    print(f"📋 Current working directory: {os.getcwd()}")
    print(f"🔧 Environment loaded from: {os.path.abspath('.env') if os.path.exists('.env') else 'No .env file found'}")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True,
        reload_dirs=["app"]
    )