# ChatsParty DevContainer Setup Guide

This guide will help you set up a development container for the ChatsParty project on Windows, providing a consistent Linux environment for development.

## Prerequisites

1. **Docker Desktop for Windows**
   - Download and install from [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Ensure WSL 2 is enabled
   - Start Docker Desktop

2. **Visual Studio Code**
   - Download from [VS Code](https://code.visualstudio.com/)
   - Install the "Dev Containers" extension

3. **Git for Windows**
   - Download from [Git for Windows](https://gitforwindows.org/)

## Container Configuration Options

We provide two different container configurations to suit different needs:

### 🐍 Python-Focused Configuration (Default)
**File**: `.devcontainer/devcontainer.json`

**Best for**:
- Quick setup and development
- Python/FastAPI focused work
- Smaller container size
- Faster initial build

**What's included**:
- Python 3.12 with pre-configured environment
- Node.js 20 for frontend
- Essential development tools
- Basic system utilities

### 🐧 Ubuntu-Focused Configuration (Advanced)
**File**: `.devcontainer/devcontainer-ubuntu.json`

**Best for**:
- Full system control and flexibility
- Advanced debugging and development
- Multimedia and audio processing
- Production-like environment
- Custom tool installation

**What's included**:
- Ubuntu 22.04 LTS base system
- Complete development toolchain
- Advanced CLI tools (ripgrep, bat, exa, fzf)
- Zsh with Oh My Zsh
- Full multimedia support
- SSH server
- Jupyter notebooks
- Comprehensive debugging tools

## Quick Start

### Option 1: Python Configuration (Recommended for most users)

1. **Clone the repository** (if not already done):
   ```bash
   git clone <your-repo-url>
   cd chatsparty
   ```

2. **Open in VS Code**:
   ```bash
   code .
   ```

3. **Reopen in Container**:
   - When VS Code opens, you'll see a notification: "Reopen in Container"
   - Click "Reopen in Container" or use `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
   - Wait for the container to build (this may take 5-10 minutes on first run)

### Option 2: Ubuntu Configuration (For advanced users)

1. **Switch to Ubuntu configuration**:
   ```bash
   # Rename the Ubuntu configuration to be the default
   mv .devcontainer/devcontainer-ubuntu.json .devcontainer/devcontainer.json
   mv .devcontainer/setup-ubuntu.sh .devcontainer/setup.sh
   ```

2. **Open in VS Code and reopen in container** (same as above)

## What's Included

### Development Environment
- **Python 3.12** with FastAPI backend
- **Node.js 20** with React/TypeScript frontend
- **PostgreSQL 15** (optional, via docker-compose)
- **Redis 7** (optional, for caching)
- **Ollama** (optional, for local AI models)
- **FFmpeg** for audio processing

### Development Tools
- **uv** for Python package management
- **Black** for code formatting
- **Flake8** for linting
- **Prettier** for frontend formatting
- **ESLint** for TypeScript linting
- **Pre-commit hooks**

### VS Code Extensions
- Python development tools
- TypeScript/React support
- Tailwind CSS IntelliSense
- Docker support
- Git integration

## Development Workflow

### Starting Services (Optional)

If you want to use PostgreSQL, Redis, or Ollama:

```bash
# From the .devcontainer directory
cd .devcontainer
./start-services.sh
```

### Running the Application

#### Backend (FastAPI)
```bash
# Option 1: Use the convenience script
./.devcontainer/scripts/start-backend.sh

# Option 2: Manual start
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (React/Vite)
```bash
# Option 1: Use the convenience script
./.devcontainer/scripts/start-frontend.sh

# Option 2: Manual start
cd frontend
npm run dev
```

### Ubuntu Configuration Bonus Commands

If using the Ubuntu configuration, you get additional convenience commands:

```bash
# Start all services at once
start-all

# Stop all services
stop-all

# Navigate quickly
backend    # Go to backend directory
frontend   # Go to frontend directory

# Code quality
format     # Format Python code
lint       # Lint Python code
test       # Run tests
```

### Database Operations

```bash
# Run migrations
cd backend
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "Description"

# Reset database
uv run alembic downgrade base
uv run alembic upgrade head
```

## Port Configuration

The devcontainer automatically forwards these ports:

- **3000**: Frontend (Vite)
- **8000**: Backend (FastAPI)
- **5432**: PostgreSQL (if using docker-compose)
- **6379**: Redis (if using docker-compose)
- **11434**: Ollama (if using docker-compose)
- **22**: SSH (Ubuntu configuration only)

## Environment Configuration

### Backend Environment Variables

The setup script creates a basic `.env` file in the backend directory. Update it with your actual values:

```env
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
```

### Frontend Environment Variables

The setup script creates a basic `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ChatsParty
VITE_DEBUG=true
```

## Configuration Comparison

| Feature | Python Config | Ubuntu Config |
|---------|---------------|---------------|
| **Base Image** | Python 3.12 | Ubuntu 22.04 |
| **Setup Time** | ~5-10 minutes | ~10-15 minutes |
| **Container Size** | Smaller | Larger |
| **Flexibility** | Limited | Full system control |
| **Debugging** | Basic | Advanced |
| **CLI Tools** | Basic | Modern (ripgrep, bat, exa, fzf) |
| **Shell** | Bash | Zsh + Oh My Zsh |
| **Multimedia** | FFmpeg basic | FFmpeg full + codecs |
| **SSH Access** | No | Yes |
| **Jupyter** | No | Yes |
| **Custom Tools** | Limited | Easy to add any |

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Ensure Docker Desktop is running
   - Check that WSL 2 is enabled
   - Try rebuilding the container: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

2. **Port conflicts**
   - Check if ports 3000, 8000, 5432 are already in use
   - Stop conflicting services or modify the port forwarding in `devcontainer.json`

3. **Permission issues**
   - The container runs as the `vscode` user
   - If you encounter permission issues, check file ownership

4. **Dependencies not installed**
   - The setup script should install everything automatically
   - If something is missing, run the setup script manually:
     ```bash
     bash .devcontainer/setup.sh
     ```

5. **Database connection issues**
   - Ensure PostgreSQL is running: `docker-compose up -d postgres`
   - Check the connection string in your `.env` file
   - Verify the database exists: `docker-compose exec postgres psql -U postgres -d chatsparty`

### Rebuilding the Container

If you encounter persistent issues:

1. `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"
2. This will completely rebuild the container with a fresh environment

### Logs and Debugging

- **Container logs**: Check the "Dev Container" output panel in VS Code
- **Service logs**: `docker-compose logs -f [service-name]`
- **Application logs**: Check the terminal where you started the application

## Performance Tips

1. **Use WSL 2**: Ensure Docker Desktop is using WSL 2 backend
2. **Allocate resources**: Give Docker Desktop more RAM and CPU in settings
3. **Volume mounts**: The workspace is mounted as a volume for better performance
4. **Exclude node_modules**: The `.devcontainer/.gitignore` excludes unnecessary files

## Which Configuration Should You Choose?

### Choose Python Configuration if:
- You want a quick setup
- You're primarily working on Python/FastAPI
- You don't need advanced system tools
- You want a smaller container footprint
- You're new to devcontainers

### Choose Ubuntu Configuration if:
- You need full system control
- You want advanced debugging capabilities
- You need to install custom system tools
- You're working with multimedia/audio processing
- You want a production-like environment
- You're comfortable with Linux administration

## Next Steps

1. Choose your preferred configuration
2. Update the environment variables with your actual API keys
3. Start the development servers
4. Run database migrations
5. Begin development!

## Support

If you encounter issues not covered in this guide:

1. Check the appropriate README file in the container:
   - `.devcontainer/README.md` (Python config)
   - `.devcontainer/README-UBUNTU.md` (Ubuntu config)
2. Review the setup logs in the terminal
3. Ensure all prerequisites are properly installed
4. Try rebuilding the container

Happy coding! 🚀 