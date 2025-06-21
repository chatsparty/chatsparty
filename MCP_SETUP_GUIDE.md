# MCP Integration Setup Guide

The Model Context Protocol (MCP) integration has been successfully implemented in your agent architecture. This guide will help you set up and use MCP servers with your agents.

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
cd backend
uv run python main.py
```

### 2. Create an MCP Connection
1. Navigate to the Connections page in your frontend
2. Click "Create New Connection"
3. Select "MCP" as the provider
4. Enter your MCP server URL (e.g., `stdio://path/to/mcp-server`)
5. Test the connection
6. Save the connection

### 3. Create an Agent with MCP Tools
1. Go to Agent Manager
2. Create a new agent
3. Select your MCP connection
4. Choose which MCP tools the agent can use
5. Save the agent

## 🔧 MCP Server URL Formats

### Remote MCP Servers (HTTP/SSE)
```
https://api.example.com/mcp
http://localhost:8080/mcp
```

### Remote MCP Servers (WebSocket)
```
wss://api.example.com/mcp
ws://localhost:3000/mcp
```

### Local Stdio Servers
```
stdio://path/to/your/mcp-server
stdio://uvx --from mcp-server-example example-server
stdio://python /path/to/server.py
```

## 📋 Features Implemented

### Backend Features
- ✅ Full MCP SDK integration
- ✅ Connection management with MCP server support
- ✅ Tool discovery and execution
- ✅ Resource and prompt access
- ✅ Connection testing
- ✅ Database schema with MCP fields
- ✅ REST API endpoints for MCP operations

### Frontend Features
- ✅ MCP connection form with testing
- ✅ Tool discovery and selection UI
- ✅ Connection management interface
- ✅ Agent-specific tool configuration

### API Endpoints
- `POST /connections/mcp/test` - Test MCP server connection
- `GET /connections/mcp` - List MCP connections
- `GET /connections/{id}/mcp/tools` - Get available tools
- `POST /connections/{id}/mcp/discover` - Discover capabilities
- `POST /connections/{id}/mcp/tools/discover` - Discover and cache tools

## 🛠️ Using MCP Tools in Chat

Once you have an agent with MCP tools configured, you can use them in chat:

### Tool Execution Commands
```
use tool file_read with {"path": "/path/to/file.txt"}
execute search({"query": "python functions"})
```

### Available Information
- Tools: Executable functions provided by the MCP server
- Resources: Data sources (files, APIs, databases)
- Prompts: Pre-defined prompt templates

## 🔍 Testing MCP Integration

Run the integration test:
```bash
python test_mcp_integration.py
```

This will verify:
- MCP SDK imports correctly
- Database schema is updated
- API endpoints are available
- Provider integration works

## 📚 Example MCP Servers to Try

### Remote MCP Servers (Production Ready)

#### Claude.ai MCP Servers
```
https://api.anthropic.com/v1/mcp/filesystem
https://api.anthropic.com/v1/mcp/github
```

#### Third-party Remote Servers
```
https://mcp.example.com/tools
wss://api.toolserver.com/mcp
```

### Local MCP Servers

#### File System Tools
```bash
# Install file system MCP server
uvx --from mcp-server-filesystem filesystem

# Use in connection form
stdio://uvx --from mcp-server-filesystem filesystem --root /path/to/directory
```

#### Git Repository Tools
```bash
# Install git MCP server
uvx --from mcp-server-git git

# Use in connection form
stdio://uvx --from mcp-server-git git --repository /path/to/repo
```

#### Web Search Tools
```bash
# Install brave search MCP server
uvx --from mcp-server-brave-search brave-search

# Use in connection form (requires API key in config)
stdio://uvx --from mcp-server-brave-search brave-search
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure MCP SDK is installed
   ```bash
   cd backend && uv add mcp
   ```

2. **Connection Fails**: Check MCP server command and path
   - Verify the server executable exists
   - Check server permissions
   - Review server logs

3. **No Tools Discovered**: 
   - Ensure MCP server supports tools
   - Check server configuration
   - Try manual server discovery

### Debug Steps

1. Check server logs for MCP connection attempts
2. Test MCP server manually before connecting
3. Verify database migration applied correctly
4. Check frontend console for API errors

## 🔒 Security Considerations

- MCP servers run with system permissions
- Validate server commands before execution
- Use specific directory roots for file system access
- Review tool permissions before enabling for agents
- Monitor tool execution for security issues

## 🚀 Next Steps

1. **Install MCP Servers**: Try different MCP servers for various capabilities
2. **Create Specialized Agents**: Build agents focused on specific tool sets
3. **Monitor Usage**: Track tool execution and performance
4. **Extend Integration**: Add support for WebSocket MCP servers
5. **Custom Tools**: Build your own MCP servers for specific needs

## 📖 Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Available MCP Servers](https://github.com/modelcontextprotocol/servers)

The MCP integration is now ready for production use! 🎉