#!/bin/bash

# Script to easily switch AI providers

PROVIDER=$1
MODEL=$2
API_KEY=$3
BASE_URL=$4

if [ -z "$PROVIDER" ] || [ -z "$MODEL" ]; then
    echo "Usage: ./switch-ai-provider.sh <provider> <model> [api_key] [base_url]"
    echo ""
    echo "Providers:"
    echo "  anthropic - Claude models (requires API key)"
    echo "  groq      - Fast Llama models (requires API key)"
    echo "  ollama    - Local models (no API key needed)"
    echo "  vertex_ai - Google Vertex AI (uses ADC)"
    echo ""
    echo "Examples:"
    echo "  ./switch-ai-provider.sh anthropic claude-3-5-sonnet-20241022 sk-ant-..."
    echo "  ./switch-ai-provider.sh groq llama-3.3-70b-versatile gsk_..."
    echo "  ./switch-ai-provider.sh ollama llama3.2 '' http://localhost:11434"
    echo "  ./switch-ai-provider.sh vertex_ai gemini-2.5-flash"
    exit 1
fi

CONNECTION_ID="cmd4q7s2e0009ru4kp5l11otp"

# Update connection
if [ -n "$API_KEY" ]; then
    docker exec pgvector-16 psql -U postgres -d chatsparty -c "UPDATE \"Connection\" SET provider = '$PROVIDER', \"modelName\" = '$MODEL', \"apiKey\" = '$API_KEY' WHERE id = '$CONNECTION_ID';"
else
    docker exec pgvector-16 psql -U postgres -d chatsparty -c "UPDATE \"Connection\" SET provider = '$PROVIDER', \"modelName\" = '$MODEL', \"apiKey\" = NULL WHERE id = '$CONNECTION_ID';"
fi

if [ -n "$BASE_URL" ]; then
    docker exec pgvector-16 psql -U postgres -d chatsparty -c "UPDATE \"Connection\" SET \"baseUrl\" = '$BASE_URL' WHERE id = '$CONNECTION_ID';"
fi

# Update agents
docker exec pgvector-16 psql -U postgres -d chatsparty -c "UPDATE \"Agent\" SET \"aiConfig\" = jsonb_set(\"aiConfig\", '{provider}', '\"$PROVIDER\"') || jsonb_set(\"aiConfig\", '{modelName}', '\"$MODEL\"') WHERE \"connectionId\" = '$CONNECTION_ID';"

echo "✅ Switched to $PROVIDER with model $MODEL"

# Show current configuration
docker exec pgvector-16 psql -U postgres -d chatsparty -c "SELECT provider, \"modelName\" FROM \"Connection\" WHERE id = '$CONNECTION_ID';"