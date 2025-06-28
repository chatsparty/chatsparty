#!/usr/bin/env python3
"""
Simple development server runner that loads environment and starts uvicorn
"""

import subprocess
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
os.chdir(backend_dir)

from dotenv import load_dotenv
load_dotenv()

print("🚀 Starting Wisty Backend Development Server...")
print(f"📋 Working directory: {os.getcwd()}")
print(f"🔧 Environment file: {'.env found' if os.path.exists('.env') else 'No .env file'}")

uv_available = subprocess.run(["which", "uv"], capture_output=True).returncode == 0

if uv_available:
    print("✅ Using uv to run uvicorn...")
    cmd = [
        "uv", "run", "uvicorn", 
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000", 
        "--log-level", "info",
        "--reload"
    ]
else:
    print("✅ Using python to run uvicorn...")
    cmd = [
        "uvicorn",
        "app.main:app", 
        "--host", "0.0.0.0",
        "--port", "8000",
        "--log-level", "info", 
        "--reload"
    ]

print(f"🚀 Executing: {' '.join(cmd)}")

try:
    subprocess.run(cmd, check=True)
except KeyboardInterrupt:
    print("\n👋 Server stopped by user")
except subprocess.CalledProcessError as e:
    print(f"❌ Error running server: {e}")
    sys.exit(1)