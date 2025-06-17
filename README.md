# Wisty Workflow

A FastAPI backend with LangGraph integration and React frontend for workflow visualization.

## Project Structure

```
wisty-workflow/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── workflow_engine.py   # LangGraph workflow engine
│   ├── pyproject.toml       # Python dependencies and project config
│   └── requirements.txt     # Legacy pip requirements (optional)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── WorkflowVisualizer.tsx  # React Flow workflow visualization
    │   ├── App.tsx
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

- `GET /` - API root
- `GET /health` - Health check
- `GET /workflows` - List all workflows
- `GET /workflows/{workflow_id}/structure` - Get workflow structure
- `POST /workflows/{workflow_id}/execute` - Execute workflow

## Features

- **FastAPI Backend**: RESTful API with automatic OpenAPI documentation
- **LangGraph Integration**: Workflow engine using LangGraph for state management
- **React Flow Visualization**: Interactive workflow visualization with drag-and-drop
- **Real-time Execution**: Execute workflows and see results in real-time
- **CORS Enabled**: Frontend can communicate with backend

## Usage

1. Start both backend and frontend servers
2. Open the frontend in your browser
3. Use the workflow visualizer to:
   - Load workflow structures
   - Execute workflows
   - View execution results
   - Interact with the workflow graph