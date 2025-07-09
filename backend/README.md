# Chatsparty System API

A modern, scalable API built with Node.js, Fastify, and TypeScript for multi-agent AI chat interactions. This API provides comprehensive services for managing AI agents, conversations, user credits, and file storage.

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify (high-performance web framework)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: Mastra AI + Vercel AI SDK
- **Authentication**: JWT-based authentication
- **Storage**: Pluggable storage (Local, AWS S3, Cloudflare R2)
- **Testing**: Jest + Supertest

## Features

- **User Management**: Registration, authentication, and profile management
- **AI Agents**: Create and manage AI agents with custom configurations
- **Multi-Agent Chat**: Orchestrated conversations between multiple AI agents
- **Credit System**: Usage tracking and credit management for AI operations
- **File Storage**: Upload and manage files with multiple storage providers
- **Connections**: Manage AI provider connections (OpenAI, Anthropic, etc.)

## Prerequisites

- Node.js 20.0.0 or higher
- PostgreSQL 12+ or SQLite (for development)
- npm or yarn package manager

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd chatsparty-system/api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatsparty"
# For SQLite (development): DATABASE_URL="file:./dev.db"

# Server
PORT=4000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Storage (choose one)
STORAGE_PROVIDER=local
# STORAGE_PROVIDER=s3
# STORAGE_PROVIDER=r2

# AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Cloudflare R2 Configuration (if using R2)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=your-bucket-name

# AI Providers (add as needed)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create database schema
npm run db:push

# Run migrations (if any)
npm run db:migrate
```

## Development

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Agents

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create a new agent
- `GET /api/agents/:id` - Get agent details
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Chat

- `POST /api/chat` - Send a message to an agent
- `POST /api/chat/multi-agent` - Start a multi-agent conversation
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/:id` - Get conversation details
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Connections

- `GET /api/connections` - List all connections
- `POST /api/connections` - Create a new connection
- `GET /api/connections/:id` - Get connection details
- `PUT /api/connections/:id` - Update connection
- `DELETE /api/connections/:id` - Delete connection
- `POST /api/connections/:id/test` - Test connection

### Credits

- `GET /api/credits/balance` - Get current credit balance
- `GET /api/credits/transactions` - List credit transactions
- `POST /api/credits/add` - Add credits (admin only)
- `GET /api/credits/models` - List model pricing
- `PUT /api/credits/models/:id` - Update model pricing (admin only)

### Storage

- `POST /api/storage/upload` - Upload a file
- `GET /api/storage/files` - List user files
- `GET /api/storage/files/:id` - Get file details
- `GET /api/storage/files/:id/download` - Download file
- `DELETE /api/storage/files/:id` - Delete file
- `POST /api/storage/files/batch-delete` - Delete multiple files

### Users

- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Authentication

All API endpoints except `/api/auth/login` and `/api/auth/register` require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Development Commands

```bash
# Database
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database with sample data

# Development
npm run dev           # Start dev server with hot reload
npm run build         # Build for production
npm start            # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
```

## Project Structure

```
api/
├── src/
│   ├── app.ts              # Fastify app configuration
│   ├── config/             # Configuration files
│   ├── middleware/         # Custom middleware
│   ├── models/             # Database models (deprecated, use Prisma)
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   │   ├── agents/         # Agent management
│   │   ├── ai/            # AI integration (Mastra)
│   │   ├── chat/          # Chat functionality
│   │   ├── connections/   # Provider connections
│   │   ├── credit/        # Credit system
│   │   ├── storage/       # File storage
│   │   └── user/          # User management
│   └── utils/             # Utility functions
├── tests/                  # Test files
├── prisma/                 # Prisma schema and migrations
└── package.json           # Project dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.