# ChatsParty - Open Source Multi-Agent AI Chat Platform

ChatsParty is an open-source, full-stack platform designed for creating, managing, and orchestrating multi-agent AI conversations. It provides a comprehensive suite of tools for developers and researchers to build and experiment with collaborative AI systems.

## Features

- **Agent Management:** Create, edit, and delete AI agents with unique personalities and system prompts.
- **Multi-Agent Chat:** Initiate and participate in conversations involving multiple AI agents.
- **Connection Management:** Manage connections to various AI providers, including OpenAI, Anthropic, and Google Vertex AI.
- **User Authentication:** Secure user registration, login, and session management using JWT.
- **Credit System:** Track and manage AI model usage costs.
- **File Storage:** Upload and manage files with support for local, S3, and R2 storage.
- **Real-time Communication:** Seamless and interactive chat experience with WebSockets.
- **Extensible Architecture:** Modular design for easy addition of new features and providers.

## Technologies Used

### Backend

- **Framework:** Fastify
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT
- **AI Integration:** @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google-vertex, Mastra
- **Real-time:** Socket.IO
- **Validation:** Zod
- **Testing:** Jest

### Frontend

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui, Radix UI
- **Routing:** React Router
- **API Communication:** Axios
- **Real-time:** Socket.IO Client
- **Internationalization:** i18next
- **Testing:** Vitest

## Architecture Overview

The project is a full-stack application with a clear separation between the frontend and backend.

```mermaid
graph TD
    subgraph Frontend
        A[React UI] --> B{Vite}
        B --> C[API Client]
    end

    subgraph Backend
        D[Fastify Server] --> E{Prisma ORM}
        E --> F[PostgreSQL DB]
        D --> G[AI Services]
        G --> H[Mastra]
        H --> I[AI Models]
    end

    C --> D

    subgraph "External Services"
        I -- OpenAI --> J[OpenAI API]
        I -- Anthropic --> K[Anthropic API]
        I -- Vertex AI --> L[Vertex AI API]
    end

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#ccf,stroke:#333,stroke-width:2px
    style "External Services" fill:#cfc,stroke:#333,stroke-width:2px
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL

### Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Set up your `.env` file by copying `.env.example`.
4.  Run database migrations: `npx prisma migrate dev`
5.  Start the development server: `npm run dev`

### Frontend Setup

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Set up your `.env` file by copying `.env.example`.
4.  Start the development server: `npm run dev`

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
