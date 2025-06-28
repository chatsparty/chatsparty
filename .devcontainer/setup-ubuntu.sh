#!/bin/bash

set -e

echo "🚀 Setting up ChatsParty development environment (Ubuntu)..."

# Update package lists and upgrade system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential system packages
echo "🔧 Installing essential system packages..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    build-essential \
    pkg-config \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    tree \
    vim \
    nano \
    tmux \
    screen \
    jq \
    yq \
    httpie \
    ripgrep \
    fd-find \
    bat \
    exa \
    fzf \
    zsh \
    oh-my-zsh

# Install Python development dependencies
echo "🐍 Installing Python development dependencies..."
sudo apt-get install -y \
    python3-dev \
    python3-pip \
    python3-venv \
    python3-setuptools \
    python3-wheel \
    libssl-dev \
    libffi-dev \
    libpq-dev \
    libsqlite3-dev \
    libbz2-dev \
    libreadline-dev \
    liblzma-dev \
    libncursesw5-dev \
    libxml2-dev \
    libxmlsec1-dev \
    libgdbm-dev \
    libnss3-dev \
    libtiff5-dev \
    libjpeg8-dev \
    libopenjp2-7-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev

# Install Node.js development dependencies
echo "⚛️ Installing Node.js development dependencies..."
sudo apt-get install -y \
    nodejs \
    npm

# Install multimedia and audio processing tools
echo "🎵 Installing multimedia tools..."
sudo apt-get install -y \
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavfilter-dev \
    libavdevice-dev \
    libpostproc-dev \
    libswresample-dev \
    libx264-dev \
    libx265-dev \
    libvpx-dev \
    libmp3lame-dev \
    libopus-dev \
    libvorbis-dev \
    libtheora-dev \
    libass-dev \
    libfreetype6-dev \
    libfontconfig1-dev \
    libfribidi-dev \
    libharfbuzz-dev

# Install database tools
echo "🗄️ Installing database tools..."
sudo apt-get install -y \
    postgresql-client \
    sqlite3 \
    redis-tools

# Install Docker and Docker Compose
echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /tmp/docker.gpg > /dev/null
sudo gpg --dearmor --batch --yes -o /usr/share/keyrings/docker-archive-keyring.gpg /tmp/docker.gpg
sudo rm /tmp/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Install Rust (for uv and other tools)
echo "🦀 Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install uv for Python package management
echo "📦 Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
export PATH="$HOME/.cargo/bin:$PATH"

# Install additional Python tools
echo "🐍 Installing Python development tools..."
pip3 install --user \
    black \
    flake8 \
    isort \
    mypy \
    pytest \
    pytest-asyncio \
    pytest-cov \
    pre-commit \
    ipython \
    jupyter \
    notebook \
    ipykernel \
    virtualenv \
    pipenv \
    poetry

# Install global Node.js tools
echo "⚛️ Installing global Node.js tools..."
npm install -g \
    typescript \
    ts-node \
    nodemon \
    concurrently \
    cross-env \
    npm-check-updates \
    yarn \
    pnpm \
    eslint \
    prettier \
    create-react-app \
    create-next-app \
    create-vite

# Setup Python environment
echo "🐍 Setting up Python environment..."
cd /workspaces/chatsparty/backend

# Install Python dependencies using uv
uv sync

# Install development tools
uv add --dev black flake8 isort mypy pytest pytest-asyncio pytest-cov pre-commit

# Setup pre-commit hooks
uv add --dev pre-commit
pre-commit install

# Install frontend dependencies
echo "⚛️ Setting up Node.js environment..."
cd /workspaces/chatsparty/frontend

# Install dependencies
npm install

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p /workspaces/chatsparty/backend/storage/uploads
mkdir -p /workspaces/chatsparty/.devcontainer/ssh
mkdir -p /workspaces/chatsparty/.cache
mkdir -p /workspaces/chatsparty/logs

# Set proper permissions
chmod 755 /workspaces/chatsparty/backend/storage/uploads
chmod 700 /workspaces/chatsparty/.devcontainer/ssh

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
git config --global core.editor "code --wait"
git config --global core.autocrlf input

# Setup SSH (if needed)
echo "🔑 Setting up SSH..."
if [ ! -f /workspaces/chatsparty/.devcontainer/ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f /workspaces/chatsparty/.devcontainer/ssh/id_rsa -N ""
    echo "SSH key generated. Add the public key to your GitHub/GitLab account:"
    cat /workspaces/chatsparty/.devcontainer/ssh/id_rsa.pub
fi

# Setup shell configuration
echo "🐚 Setting up shell configuration..."
if [ ! -f ~/.zshrc ]; then
    cp /etc/zsh/zshrc ~/.zshrc
fi

# Add useful aliases and functions
cat >> ~/.zshrc << 'EOF'

# Development aliases
alias ll='exa -la'
alias la='exa -a'
alias lt='exa -T'
alias cat='bat'
alias find='fd'
alias grep='rg'

# Project-specific aliases
alias backend='cd /workspaces/chatsparty/backend'
alias frontend='cd /workspaces/chatsparty/frontend'
alias start-backend='cd /workspaces/chatsparty/backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
alias start-frontend='cd /workspaces/chatsparty/frontend && npm run dev'
alias start-services='cd /workspaces/chatsparty/.devcontainer && ./start-services.sh'

# Python virtual environment
alias venv='python3 -m venv venv'
alias activate='source venv/bin/activate'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph'

# Docker shortcuts
alias dc='docker-compose'
alias dps='docker ps'
alias dex='docker exec -it'

# Development tools
alias format='black . && isort .'
alias lint='flake8 . && mypy .'
alias test='pytest'

# Environment
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"
export PYTHONPATH="/workspaces/chatsparty/backend:$PYTHONPATH"
export NODE_ENV=development

# Function to start all services
start-all() {
    echo "🚀 Starting all ChatsParty services..."
    cd /workspaces/chatsparty/.devcontainer
    ./start-services.sh &
    sleep 5
    cd /workspaces/chatsparty/backend
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    cd /workspaces/chatsparty/frontend
    npm run dev &
    echo "✅ All services started!"
    echo "   Backend: http://localhost:8000"
    echo "   Frontend: http://localhost:3000"
    echo "   API Docs: http://localhost:8000/docs"
}

# Function to stop all services
stop-all() {
    echo "🛑 Stopping all services..."
    pkill -f "uvicorn app.main:app"
    pkill -f "npm run dev"
    cd /workspaces/chatsparty/.devcontainer
    docker-compose down
    echo "✅ All services stopped!"
}
EOF

# Set zsh as default shell
sudo chsh -s $(which zsh) $USER

# Create a helpful README for the devcontainer
echo "📝 Creating devcontainer documentation..."
cat > /workspaces/chatsparty/.devcontainer/README-UBUNTU.md << EOF
# ChatsParty Development Container (Ubuntu)

This development container provides a comprehensive Ubuntu-based Linux environment for developing the ChatsParty application.

## What's Included

### System Tools
- **Ubuntu 22.04 LTS** base system
- **Zsh** with Oh My Zsh for better shell experience
- **Development tools**: vim, nano, tmux, screen, htop, tree
- **Modern CLI tools**: ripgrep, fd-find, bat, exa, fzf

### Development Environment
- **Python 3.12** with FastAPI backend
- **Node.js 20** with React/TypeScript frontend
- **Rust** toolchain for uv and other tools
- **Docker & Docker Compose** for containerized services

### Multimedia & Audio
- **FFmpeg** with full codec support
- **Audio processing libraries** for voice features
- **Image processing tools**

### Database & Services
- **PostgreSQL** client tools
- **Redis** client tools
- **SQLite** tools
- **Ollama** for local AI models

### Development Tools
- **uv** for Python package management
- **Black, Flake8, isort** for Python code quality
- **Prettier, ESLint** for frontend code quality
- **Pre-commit hooks**
- **Jupyter notebooks** support

## Getting Started

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Choose the Ubuntu configuration if prompted
4. Wait for the container to build and setup to complete

## Quick Commands

\`\`\`bash
# Start all services
start-all

# Stop all services
stop-all

# Navigate to directories
backend    # Go to backend directory
frontend   # Go to frontend directory

# Start individual services
start-backend   # Start FastAPI server
start-frontend  # Start Vite dev server
start-services  # Start PostgreSQL, Redis, Ollama

# Code quality
format     # Format Python code
lint       # Lint Python code
test       # Run tests
\`\`\`

## Advantages of Ubuntu Base

1. **Full System Control**: Complete Ubuntu environment
2. **Latest Packages**: Access to latest Ubuntu packages
3. **Custom Tools**: Easy to add any system tools
4. **Debugging**: Better debugging capabilities
5. **Flexibility**: Can install any Linux software
6. **Consistency**: Matches production Ubuntu environments

## Ports

- **3000**: Frontend (Vite)
- **8000**: Backend (FastAPI)
- **5432**: PostgreSQL
- **6379**: Redis
- **11434**: Ollama
- **22**: SSH

## Environment Variables

The setup script creates basic .env files. Update them with your actual API keys and configuration.

## Troubleshooting

If you encounter issues:

1. Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"
2. Check the setup logs in the terminal
3. Ensure all environment variables are properly set
4. Use \`zsh\` for better shell experience
EOF

echo "✅ Ubuntu development environment setup complete!"
echo ""
echo "🎉 You're ready to start developing!"
echo ""
echo "Next steps:"
echo "1. Update the .env files with your actual API keys"
echo "2. Use 'start-all' to start all services"
echo "3. Or start individually: 'start-backend' and 'start-frontend'"
echo ""
echo "📚 Check .devcontainer/README-UBUNTU.md for more information"
echo ""
echo "🔄 To use this configuration, rename devcontainer-ubuntu.json to devcontainer.json" 