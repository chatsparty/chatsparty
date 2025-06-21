# Remote MCP Server Examples

Now that your MCP integration supports remote servers, here are some examples of how to connect to different types of MCP servers.

## 🌐 Remote MCP Servers (HTTP/SSE)

### Example 1: Public MCP Service
```
URL: https://api.mcp-tools.com/v1/filesystem
Description: Remote file system tools
```

### Example 2: Self-hosted MCP Server
```
URL: https://your-domain.com/mcp/tools
Description: Your own MCP server
Headers: {"Authorization": "Bearer your-token"}
```

### Example 3: Local Development Server
```
URL: http://localhost:8080/mcp
Description: Local MCP server for development
```

## 🔌 WebSocket MCP Servers

### Example 1: Real-time MCP Service
```
URL: wss://live.mcp-service.com/mcp
Description: Real-time tool execution
```

### Example 2: Local WebSocket Server
```
URL: ws://localhost:3000/mcp
Description: Local WebSocket MCP server
```

## 🏠 Local Stdio Servers (Original Support)

### Example 1: File System Tools
```
URL: stdio://uvx --from mcp-server-filesystem filesystem --root /Users/username/Documents
Description: Local file system access
```

### Example 2: Git Tools
```
URL: stdio://uvx --from mcp-server-git git --repository /path/to/repo
Description: Git repository operations
```

## 🧪 Testing Remote Connections

### Step 1: Test Connection in UI
1. Go to Connections page
2. Click "Create New Connection"
3. Select "MCP" provider
4. Enter remote URL (e.g., `https://api.example.com/mcp`)
5. Click "Test Connection"
6. Should see tools discovered if successful

### Step 2: Create Test Agent
1. Create new agent with MCP connection
2. Select specific tools you want to enable
3. Test in chat interface

### Step 3: Use Tools in Chat
```
use tool weather with {"location": "San Francisco"}
execute search({"query": "MCP protocol documentation"})
```

## 🛡️ Security for Remote MCP

### Authentication Headers
When creating an MCP connection, you can add authentication:

```json
{
  "server_url": "https://api.secure-mcp.com/v1",
  "server_config": {
    "headers": {
      "Authorization": "Bearer your-api-token",
      "X-API-Key": "your-api-key"
    },
    "timeout": 10
  }
}
```

### Best Practices
1. **Use HTTPS**: Always use secure connections for remote servers
2. **Validate Servers**: Only connect to trusted MCP servers
3. **Monitor Usage**: Track tool executions for security
4. **Limit Permissions**: Only enable necessary tools for each agent
5. **Regular Updates**: Keep MCP connections updated

## 🔧 Creating Your Own Remote MCP Server

### Simple Python MCP Server
```python
# server.py
from mcp.server.fastapi import FastAPIServer
from fastapi import FastAPI

app = FastAPI()
mcp_server = FastAPIServer(app)

@mcp_server.tool()
async def hello_world(name: str) -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

### Deploy and Connect
1. Deploy your server to a cloud provider
2. Get the public URL (e.g., `https://your-app.herokuapp.com/mcp`)
3. Use that URL in your MCP connection form
4. Test and use the tools!

## 📊 Connection Status Monitoring

The system now supports monitoring remote MCP connections:

- **Connection Health**: Automatic reconnection on failures
- **Latency Tracking**: Monitor response times for remote servers
- **Error Handling**: Graceful fallbacks when servers are unavailable
- **Tool Availability**: Real-time updates when server capabilities change

## 🚀 Advanced Features

### Load Balancing Multiple Servers
You can create multiple MCP connections for redundancy:
1. Primary: `https://api.mcp-primary.com/mcp`
2. Backup: `https://api.mcp-backup.com/mcp`

### Custom Tool Routing
Configure agents to use different servers for different tool types:
- File operations: Local stdio server
- Web search: Remote HTTP server
- AI analysis: Cloud MCP service

This gives you the flexibility to build powerful, distributed AI agent systems! 🎉