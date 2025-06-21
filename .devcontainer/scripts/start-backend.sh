#!/bin/bash

# Script to start the FastAPI backend server
# Run this from the project root or backend directory

set -e

echo "🚀 Starting ChatsParty Backend..."

# Navigate to backend directory
cd /workspaces/chatsparty/backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Using default configuration."
fi

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Installing now..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
uv sync

# Run database migrations
echo "🗄️  Running database migrations..."
uv run alembic upgrade head

# Start the server
echo "🌐 Starting FastAPI server..."
echo "   Backend will be available at: http://localhost:8000"
echo "   API documentation at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 