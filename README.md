# ChatsParty

A full-stack AI chat application with FastAPI backend and React frontend featuring multi-agent conversations and Ollama integration.




https://github.com/user-attachments/assets/14d0536f-4aea-4ef7-b019-b4356519ee63



## Project Structure

```
chatsparty/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── core/
│   │   │   └── config.py        # CORS and app configuration
│   │   ├── routers/
│   │   │   ├── chat.py          # Chat and agent endpoints
│   │   │   └── health.py        # Health check endpoint
│   │   ├── services/
│   │   │   ├── ai_service.py    # Multi-agent AI system with Ollama
│   │   │   └── model_service.py # Model management and availability
│   │   └── models/
│   │       └── chat.py          # Pydantic models for API validation
│   ├── main.py                  # Server startup script
│   └── pyproject.toml           # Python dependencies (uv managed)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatInterface.tsx     # Single agent chat interface
    │   │   └── ui/                   # shadcn/ui components
    │   ├── pages/
    │   │   ├── AgentManager/         # Agent creation and management
    │   │   └── MultiAgentChat/       # Multi-agent conversation interface
    │   ├── App.tsx                   # Main app with tab navigation
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

## Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies using uv:
   ```bash
   uv sync
   ```

3. Run the FastAPI server:
   ```bash
   uv run python main.py
   ```

   Or activate the virtual environment and run directly:
   ```bash
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   python main.py
   ```

The API will be available at `http://localhost:8000`

## Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Health & Models
- `GET /health` - Health check endpoint
- `GET /chat/models` - List available Ollama models

### Simple Chat
- `POST /chat` - Simple chat with default model

### Agent Management
- `POST /chat/agents` - Create a new AI agent
- `GET /chat/agents` - List all created agents
- `POST /chat/agents/chat` - Chat with a specific agent

### Multi-Agent Conversations
- `POST /chat/agents/conversation` - Start multi-agent conversation
- `POST /chat/agents/conversation/stream` - Stream multi-agent conversation (Server-Sent Events)
- `GET /chat/conversations/{conversation_id}` - Get conversation history

## Features

- **FastAPI Backend**: RESTful API with automatic OpenAPI documentation
- **Ollama Integration**: Local LLM integration (default model: gemma3:4b)
- **Multi-Agent System**: Create and manage multiple AI agents with custom personalities
- **Agent Manager**: Web interface for creating, configuring, and managing AI agents
- **Multi-Agent Conversations**: Facilitate conversations between multiple AI agents
- **Real-time Streaming**: Stream multi-agent conversations using Server-Sent Events
- **Modern UI**: React + TypeScript frontend with Tailwind CSS and shadcn/ui components
- **Conversation History**: Track and retrieve conversation history
- **CORS Enabled**: Frontend can communicate with backend

## Usage

1. **Start both backend and frontend servers**
2. **Open the frontend in your browser at http://localhost:5173**
3. **Use the application features:**
   - **Agent Manager**: Create and configure AI agents with custom names, prompts, and characteristics
   - **Multi-Agent Chat**: Start conversations between multiple agents and watch them interact
   - **Simple Chat**: Direct chat with the default AI model

### Agent Manager
- Create agents with custom personalities and chat styles
- Configure agent characteristics (creativity, response length, etc.)
- Use preset templates for common agent types
- View and manage all created agents

### Multi-Agent Chat
- Select multiple agents to participate in conversations
- Set initial topics and watch agents discuss
- Stream conversations in real-time
- View conversation history and message flow
