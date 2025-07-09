# Migration Guide: Python/FastAPI to Node.js/Fastify

This guide helps you transition from the Python/FastAPI implementation to the new Node.js/Fastify API.

## Overview

The new Node.js API maintains compatibility with the existing frontend while providing improved performance, better TypeScript support, and a more modern architecture using Mastra AI and Vercel AI SDK.

## Key Differences

### 1. Technology Stack Changes

| Component | Python Stack | Node.js Stack |
|-----------|-------------|---------------|
| Runtime | Python 3.11+ | Node.js 20+ |
| Framework | FastAPI | Fastify |
| ORM | SQLModel | Prisma |
| AI Framework | LangGraph | Mastra AI |
| Model Provider | Custom | Vercel AI SDK |
| Async | asyncio | Native Promise/async |
| Package Manager | pip/uv | npm |

### 2. API Endpoint Changes

The base URL changes from `http://localhost:8000` to `http://localhost:3000`.

Most endpoints remain the same with minor adjustments:

| Python API | Node.js API | Notes |
|------------|-------------|-------|
| `/health` | `/api/health` | Added `/api` prefix |
| `/agents` | `/api/agents` | Same functionality |
| `/chat` | `/api/chat` | Same functionality |
| `/chat/agents/conversation` | `/api/chat/multi-agent` | Renamed for clarity |
| `/connections` | `/api/connections` | Same functionality |
| `/credits` | `/api/credits` | Enhanced with more endpoints |
| `/auth/*` | `/api/auth/*` | Same JWT implementation |

### 3. Database Schema Differences

#### User Model
- Python: `is_credits_purchased` field
- Node.js: Removed (redundant with credit balance)
- Migration: No action needed, field ignored

#### Agent Model
- Python: `model_config` field
- Node.js: `aiConfig` field (renamed to avoid Prisma conflicts)
- Migration: Automatic mapping in API layer

#### Connection Model
- Python: `api_key` stored directly
- Node.js: `encryptedApiKey` with encryption
- Migration: Existing keys will be encrypted on first update

#### New Models in Node.js
- `CreditTransaction`: Detailed transaction logging
- `ModelCreditCost`: Dynamic model pricing
- `StorageFile`: File metadata tracking

### 4. Authentication

Authentication remains JWT-based and tokens are compatible between implementations. No changes needed for existing tokens.

### 5. Request/Response Format

Request and response formats remain largely the same. Key differences:

#### Error Responses
Python:
```json
{
  "detail": "Error message"
}
```

Node.js:
```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

#### Multi-Agent Chat
Python:
```json
{
  "agent_ids": ["id1", "id2"],
  "message": "Start conversation",
  "max_rounds": 5
}
```

Node.js:
```json
{
  "agentIds": ["id1", "id2"],
  "message": "Start conversation",
  "maxRounds": 5
}
```

## Migration Steps

### 1. Database Migration

```bash
# Export data from Python SQLite database
cd backend
python manage_db.py export-data > data_export.json

# Import into Node.js database
cd ../api
npm run db:import -- ../backend/data_export.json
```

### 2. Environment Variables

Update your `.env` file:

```env
# Python → Node.js mapping
OLLAMA_MODEL=gemma3:4b → Not needed (configured per agent)
VM_PROVIDER=docker → Not migrated
DATABASE_URL → Same format
JWT_SECRET → Same value
```

### 3. Frontend Updates

Update API configuration:

```typescript
// src/config/api.ts
- export const API_BASE_URL = 'http://localhost:8000';
+ export const API_BASE_URL = 'http://localhost:3000/api';
```

Update field names from snake_case to camelCase:

```typescript
// Example: Agent interface
interface Agent {
-  model_config: any;
+  aiConfig: any;
-  created_at: string;
+  createdAt: string;
}
```

### 4. Docker Compose Update

If using Docker Compose:

```yaml
services:
  backend:
-   build: ./backend
+   build: ./api
    ports:
-     - "8000:8000"
+     - "3000:3000"
    environment:
-     - OLLAMA_BASE_URL=http://ollama:11434
+     - NODE_ENV=production
```

## Feature Compatibility

### Supported Features
- ✅ User authentication and management
- ✅ Agent creation and management
- ✅ Single and multi-agent chat
- ✅ Credit system with usage tracking
- ✅ Connection management
- ✅ File storage (Local, S3, R2)
- ✅ SSE streaming for chat responses

### Not Migrated (Deprecated)
- ❌ Podcast generation
- ❌ Project/VM management
- ❌ Voice connections (can be re-added if needed)
- ❌ WebSocket connections (using SSE instead)

### Enhanced Features
- 📈 Better performance with Fastify
- 📈 Type-safe API with TypeScript
- 📈 Improved AI integration with Mastra
- 📈 More flexible model provider support
- 📈 Detailed credit transaction history
- 📈 Better error handling and validation

## Common Issues and Solutions

### Issue 1: CORS Errors
**Solution**: The Node.js API has CORS properly configured. Ensure your frontend is using the correct API URL.

### Issue 2: Field Name Mismatches
**Solution**: The API automatically handles snake_case to camelCase conversion for backward compatibility.

### Issue 3: Missing Ollama Integration
**Solution**: Ollama is now configured per connection rather than globally. Create an Ollama connection through the Connections API.

### Issue 4: Credit System Differences
**Solution**: The new credit system is more granular. Existing credit balances are preserved, but transaction history starts fresh.

## Testing the Migration

1. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Authentication**:
   ```bash
   # Login with existing credentials
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password"}'
   ```

3. **List Agents**:
   ```bash
   curl http://localhost:3000/api/agents \
     -H "Authorization: Bearer <token>"
   ```

## Rollback Plan

If you need to rollback to the Python API:

1. Stop the Node.js server
2. Start the Python server on port 8000
3. Update frontend API_BASE_URL back to `http://localhost:8000`
4. Restore database from backup if schema was modified

## Support

For migration issues:
1. Check the error logs for detailed information
2. Ensure all environment variables are properly set
3. Verify database connection and schema
4. Test with the provided integration tests

## Future Considerations

The Node.js API is designed to be extensible. Future enhancements may include:
- GraphQL API support
- Real-time WebSocket connections
- Advanced caching with Redis
- Horizontal scaling with clustering
- OpenAPI/Swagger documentation