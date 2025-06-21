#!/bin/bash

# Script to start the React frontend server
# Run this from the project root or frontend directory

set -e

echo "🚀 Starting ChatsParty Frontend..."

# Navigate to frontend directory
cd /workspaces/chatsparty/frontend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Creating default .env..."
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ChatsParty
VITE_DEBUG=true
EOF
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌐 Starting Vite development server..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   (Accessible from your desktop via port forwarding)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev 