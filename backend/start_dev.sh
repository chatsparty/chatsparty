#!/bin/bash
# Development server startup script with environment loading

echo "🚀 Starting Wisty Backend Development Server..."
echo "📁 Working directory: $(pwd)"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Found .env file"
else
    echo "⚠️  No .env file found - creating template..."
    cat > .env << 'EOF'
# Database
DATABASE_URL=sqlite:///./wisty.db

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# VM Provider (docker or fly)
VM_PROVIDER=docker

# Optional: Fly.io settings (if using fly provider)
# FLY_TOKEN=your_fly_token_here
# FLY_APP_NAME=wisty-workspace

# Optional: AI API Keys
# OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here
EOF
    echo "📝 Created .env template - please update with your values"
fi

# Check if uv is available
if command -v uv &> /dev/null; then
    echo "✅ Using uv to run development server..."
    uv run python dev_server.py
else
    echo "✅ Using python to run development server..."
    python dev_server.py
fi