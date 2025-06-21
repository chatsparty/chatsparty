#!/bin/bash

set -e

echo "🚀 Setting up ChatsParty development environment..."

# Update package lists
sudo apt-get update

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    ffmpeg \
    postgresql-client \
    curl \
    wget \
    unzip \
    build-essential \
    pkg-config \
    libssl-dev \
    libffi-dev \
    python3-dev \
    libpq-dev

# Install Python dependencies
echo "🐍 Setting up Python environment..."
cd /workspaces/chatsparty/backend

# Install uv for faster Python package management
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.cargo/bin:$PATH"

# Install Python dependencies using uv
uv sync

# Install development tools
uv add --dev black flake8 isort mypy pytest pytest-asyncio

# Setup pre-commit hooks
uv add --dev pre-commit
pre-commit install

# Install frontend dependencies
echo "⚛️ Setting up Node.js environment..."
cd /workspaces/chatsparty/frontend

# Install dependencies
npm install

# Install global development tools
npm install -g @types/node typescript

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p /workspaces/chatsparty/backend/storage/uploads
mkdir -p /workspaces/chatsparty/.devcontainer/ssh

# Set proper permissions
chmod 755 /workspaces/chatsparty/backend/storage/uploads

# Create .env file for backend if it doesn't exist
if [ ! -f /workspaces/chatsparty/backend/.env ]; then
    echo "🔧 Creating backend .env file..."
    cat > /workspaces/chatsparty/backend/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatsparty
DATABASE_URL_SQLITE=sqlite:///./chatsparty.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=ChatsParty
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Storage Configuration
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage/uploads

# AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=your-openai-api-key-here

# Voice Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here

# Development
DEBUG=true
LOG_LEVEL=INFO
EOF
fi

# Create .env file for frontend if it doesn't exist
if [ ! -f /workspaces/chatsparty/frontend/.env ]; then
    echo "🔧 Creating frontend .env file..."
    cat > /workspaces/chatsparty/frontend/.env << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ChatsParty
VITE_DEBUG=true
EOF
fi

# Setup Git configuration
echo "🔧 Setting up Git configuration..."
git config --global init.defaultBranch main
git config --global pull.rebase false

# Create a helpful README for the devcontainer
echo "📝 Creating devcontainer documentation..."
cat > /workspaces/chatsparty/.devcontainer/README.md << EOF
# ChatsParty Development Container

This development container provides a consistent Linux environment for developing the ChatsParty application.

## What's Included

- **Python 3.12** with FastAPI backend
- **Node.js 20** with React/TypeScript frontend
- **PostgreSQL** client tools
- **FFmpeg** for audio processing
- **Development tools**: Black, Flake8, Prettier, ESLint
- **VS Code extensions** for Python, TypeScript, and Tailwind CSS

## Getting Started

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the container to build and setup to complete

## Development Commands

### Backend (Python/FastAPI)
\`\`\`bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

### Frontend (React/Vite)
\`\`\`bash
cd frontend
npm run dev
\`\`\`

### Database Migrations
\`\`\`bash
cd backend
uv run alembic upgrade head
\`\`\`

## Ports

- **3000**: Frontend (Vite)
- **8000**: Backend (FastAPI)
- **5432**: PostgreSQL (if running locally)

## Environment Variables

The setup script creates basic .env files. Update them with your actual API keys and configuration.

## Troubleshooting

If you encounter issues:

1. Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"
2. Check the setup logs in the terminal
3. Ensure all environment variables are properly set
EOF

echo "✅ Development environment setup complete!"
echo ""
echo "🎉 You're ready to start developing!"
echo ""
echo "Next steps:"
echo "1. Update the .env files with your actual API keys"
echo "2. Start the backend: cd backend && uv run uvicorn app.main:app --reload"
echo "3. Start the frontend: cd frontend && npm run dev"
echo ""
echo "📚 Check .devcontainer/README.md for more information" 