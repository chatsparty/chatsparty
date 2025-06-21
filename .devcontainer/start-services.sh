#!/bin/bash

# Script to start optional development services
# Run this from the .devcontainer directory

set -e

echo "🚀 Starting ChatsParty development services..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Start services
echo "📦 Starting PostgreSQL, Redis, and Ollama..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL
echo "🔍 Checking PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres; do
    echo "⏳ PostgreSQL is not ready yet. Waiting..."
    sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis
echo "🔍 Checking Redis..."
until docker-compose exec -T redis redis-cli ping; do
    echo "⏳ Redis is not ready yet. Waiting..."
    sleep 2
done
echo "✅ Redis is ready!"

# Wait for Ollama
echo "🔍 Checking Ollama..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
    echo "⏳ Ollama is not ready yet. Waiting..."
    sleep 2
done
echo "✅ Ollama is ready!"

echo ""
echo "🎉 All services are running!"
echo ""
echo "Services:"
echo "  📊 PostgreSQL: localhost:5432"
echo "  🔴 Redis: localhost:6379"
echo "  🤖 Ollama: localhost:11434"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f" 