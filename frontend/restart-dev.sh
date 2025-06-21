#!/bin/bash

echo "🔄 Restarting Vite development server..."

# Kill any existing Vite processes
pkill -f "vite" || true

# Wait a moment for processes to terminate
sleep 2

# Start Vite with the new configuration
echo "🚀 Starting Vite with hot reload enabled..."
npm run dev 