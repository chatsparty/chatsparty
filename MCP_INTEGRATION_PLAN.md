# MCP Integration Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for integrating Model Context Protocol (MCP) support into the existing agent architecture. The integration will allow agents to connect to remote MCP servers and leverage their tools, resources, and prompts.

## Current Architecture Analysis

### Backend Structure
- **UnifiedModelService**: Central service managing all AI model providers (Ollama, OpenAI, Anthropic, etc.)
- **Connection Management**: Database-backed system with encryption for API keys
- **Agent System**: Agents tied to specific connections with flexible JSON configuration
- **Provider Pattern**: Unified interface with provider-specific requirements

### Frontend Structure
- **Dynamic Forms**: Provider-based form generation with type safety
- **Connection UI**: CRUD operations with connection testing
- **Agent Configuration**: Model selection and configuration interfaces

## MCP Integration Strategy

### Phase 1: Core Infrastructure

#### 1.1 Backend Dependencies
```bash
# Add MCP Python SDK
uv add mcp
```

#### 1.2 Database Schema Extensions
**Extend Connection Model** (`backend/app/models/connection.py`):
```python
class Connection(Base):
    # ... existing fields ...
    
    # MCP-specific fields
    mcp_server_url: Optional[str] = None
    mcp_server_config: Optional[Dict[str, Any]] = None  # JSON field
    available_tools: Optional[List[Dict[str, Any]]] = None  # Cached tools
    mcp_capabilities: Optional[Dict[str, Any]] = None  # Server capabilities
```

#### 1.3 UnifiedModelService Extension
**Update Provider Configuration** (`backend/app/services/ai/infrastructure/unified_model_service.py`):
```python
SUPPORTED_PROVIDERS = {
    # ... existing providers ...
    'mcp': {
        'models': [],  # MCP servers don't have traditional models
        'requires_api_key': False,
        'base_url_required': True,  # MCP server URL
        'supports_tools': True,
        'supports_resources': True,
        'connection_type': 'mcp_server'
    }
}
```

### Phase 2: MCP Provider Implementation

#### 2.1 MCP Client Service
**Create MCPClientService** (`backend/app/services/mcp/mcp_client_service.py`):
```python
class MCPClientService:
    """Service for managing MCP server connections and interactions"""
    
    def __init__(self):
        self.active_connections: Dict[str, MCPClient] = {}
    
    async def connect_to_server(self, connection_id: str, server_url: str) -> MCPClient:
        """Establish connection to MCP server"""
        pass
    
    async def discover_capabilities(self, client: MCPClient) -> Dict[str, Any]:
        """Discover server capabilities (tools, resources, prompts)"""
        pass
    
    async def execute_tool(self, client: MCPClient, tool_name: str, arguments: Dict) -> Any:
        """Execute tool on MCP server"""
        pass
    
    async def get_resource(self, client: MCPClient, resource_uri: str) -> Any:
        """Retrieve resource from MCP server"""
        pass
```

#### 2.2 MCP Provider Implementation
**Create MCPProvider** (`backend/app/services/ai/infrastructure/providers/mcp_provider.py`):
```python
class MCPProvider:
    """MCP provider implementing the unified provider interface"""
    
    def __init__(self, mcp_client_service: MCPClientService):
        self.mcp_client_service = mcp_client_service
    
    async def create_agent(self, connection: Connection, config: Dict) -> Any:
        """Create agent with MCP capabilities"""
        pass
    
    async def send_message(self, agent: Any, message: str, tools: List[Dict] = None) -> str:
        """Send message with tool execution support"""
        pass
```

### Phase 3: Connection Management Updates

#### 3.1 Connection Service Extensions
**Update ConnectionService** (`backend/app/services/connection_service.py`):
```python
class ConnectionService:
    # ... existing methods ...
    
    async def test_mcp_connection(self, server_url: str) -> Dict[str, Any]:
        """Test MCP server connection and discover capabilities"""
        pass
    
    async def discover_mcp_tools(self, connection_id: str) -> List[Dict[str, Any]]:
        """Discover and cache MCP server tools"""
        pass
    
    async def update_mcp_capabilities(self, connection_id: str) -> None:
        """Update cached MCP server capabilities"""
        pass
```

#### 3.2 API Endpoints
**Extend Connection API** (`backend/app/api/routes/connections.py`):
```python
@router.post("/{connection_id}/mcp/test")
async def test_mcp_connection(connection_id: str):
    """Test MCP server connection"""
    pass

@router.get("/{connection_id}/mcp/tools")
async def get_mcp_tools(connection_id: str):
    """Get available MCP tools"""
    pass

@router.post("/{connection_id}/mcp/discover")
async def discover_mcp_capabilities(connection_id: str):
    """Discover MCP server capabilities"""
    pass
```

### Phase 4: Frontend Integration

#### 4.1 Connection Form Updates
**Extend ConnectionForm** (`frontend/src/components/ConnectionForm.tsx`):
```typescript
// Add MCP-specific form fields
const MCPConnectionFields = ({ connection, onChange }) => (
  <>
    <Input
      label="MCP Server URL"
      value={connection.mcp_server_url || ''}
      onChange={(e) => onChange({ mcp_server_url: e.target.value })}
      placeholder="ws://localhost:3000/mcp"
    />
    <Button onClick={testMCPConnection}>Test Connection</Button>
    <ToolDiscovery connection={connection} />
  </>
);
```

#### 4.2 Tool Management UI
**Create MCPToolManager** (`frontend/src/components/MCPToolManager.tsx`):
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

const MCPToolManager: React.FC<{
  connectionId: string;
  availableTools: MCPTool[];
  onToolsSelected: (tools: string[]) => void;
}> = ({ connectionId, availableTools, onToolsSelected }) => {
  // Tool selection interface
  // Tool configuration options
  // Tool usage permissions
};
```

#### 4.3 Chat Interface Extensions
**Update Chat Components**:
- Tool execution indicators
- Tool result display
- Enhanced message types for tool interactions

### Phase 5: Agent Integration

#### 5.1 Agent Configuration
**Extend Agent Model** to support MCP tool selection:
```python
class Agent(Base):
    # ... existing fields ...
    selected_mcp_tools: Optional[List[str]] = None
    mcp_tool_config: Optional[Dict[str, Any]] = None
```

#### 5.2 Chat Service Updates
**Update ChatService** for tool execution:
```python
class ChatService:
    async def process_message_with_tools(
        self, 
        agent_id: str, 
        message: str, 
        available_tools: List[str]
    ) -> str:
        """Process message with MCP tool execution"""
        pass
```

## Implementation Timeline

### Week 1: Infrastructure Setup
- [ ] Add MCP SDK dependency
- [ ] Extend database schema
- [ ] Create migration scripts
- [ ] Update UnifiedModelService configuration

### Week 2: MCP Client Implementation
- [ ] Implement MCPClientService
- [ ] Create MCP connection management
- [ ] Implement tool discovery and execution
- [ ] Add resource access capabilities

### Week 3: Provider Integration
- [ ] Create MCPProvider class
- [ ] Integrate with UnifiedModelService
- [ ] Implement agent creation with MCP support
- [ ] Add message processing with tool execution

### Week 4: API Extensions
- [ ] Extend Connection API endpoints
- [ ] Add MCP-specific routes
- [ ] Implement connection testing
- [ ] Add capability discovery endpoints

### Week 5: Frontend Development
- [ ] Update connection forms
- [ ] Create tool management UI
- [ ] Implement connection testing interface
- [ ] Add tool selection components

### Week 6: Chat Integration
- [ ] Update chat interfaces for tool support
- [ ] Implement tool execution display
- [ ] Add tool result visualization
- [ ] Enhance message types

### Week 7: Agent Configuration
- [ ] Extend agent creation with MCP tools
- [ ] Implement tool permission system
- [ ] Add agent-specific tool configuration
- [ ] Update agent management UI

### Week 8: Testing & Polish
- [ ] Comprehensive testing suite
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Documentation updates

## Technical Considerations

### Security
- **Server Validation**: Verify MCP server certificates and authenticity
- **Tool Sandboxing**: Isolate tool execution to prevent system compromise
- **Permission System**: Granular control over tool access per agent
- **Input Validation**: Sanitize all tool inputs and outputs

### Performance
- **Connection Pooling**: Reuse MCP connections across requests
- **Capability Caching**: Cache discovered tools and capabilities
- **Async Operations**: Non-blocking tool execution
- **Timeout Handling**: Proper timeouts for MCP operations

### Error Handling
- **Connection Failures**: Graceful handling of server disconnections
- **Tool Errors**: Safe handling of tool execution failures
- **Fallback Mechanisms**: Alternative paths when MCP unavailable
- **User Feedback**: Clear error messages and recovery options

### User Experience
- **Loading States**: Clear indicators for tool discovery and execution
- **Tool Documentation**: Display tool descriptions and usage examples
- **Connection Status**: Real-time status of MCP server connections
- **Configuration Wizard**: Guided setup for MCP servers

## Testing Strategy

### Unit Tests
- MCPClientService functionality
- Provider implementation
- Connection management
- Tool execution logic

### Integration Tests
- End-to-end MCP server communication
- Agent creation with MCP support
- Chat flow with tool execution
- Frontend-backend integration

### Manual Testing
- MCP server discovery and connection
- Tool selection and configuration
- Chat interactions with tools
- Multi-agent tool sharing

## Deployment Considerations

### Environment Variables
```bash
# MCP-specific configuration
MCP_CONNECTION_TIMEOUT=30
MCP_TOOL_EXECUTION_TIMEOUT=120
MCP_MAX_CONCURRENT_CONNECTIONS=10
```

### Infrastructure
- MCP server deployment and management
- Network security for MCP connections
- Monitoring and logging for MCP operations
- Backup strategies for MCP configurations

## Future Enhancements

### Phase 2 Features
- **Tool Marketplace**: Discover and install MCP servers
- **Custom Tools**: Create and deploy custom MCP tools
- **Tool Analytics**: Usage metrics and performance monitoring
- **Advanced Permissions**: Role-based tool access control

### Integration Opportunities
- **Workflow Automation**: Chain tool executions
- **Data Pipeline**: Stream processing with MCP tools
- **External Integrations**: Connect to third-party services
- **Multi-Modal Tools**: Support for file, image, and audio tools

## Success Metrics

### Technical Metrics
- MCP server connection success rate > 99%
- Tool execution latency < 5 seconds average
- Zero security incidents related to MCP
- 100% test coverage for MCP components

### User Experience Metrics
- MCP server setup completion rate > 80%
- Tool usage adoption rate > 50%
- User satisfaction score > 4.5/5
- Support ticket reduction for integration issues

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating MCP support into the existing agent architecture. The phased approach ensures minimal disruption to existing functionality while adding powerful new capabilities. The focus on security, performance, and user experience will ensure a successful integration that enhances the overall platform value.

The modular design leverages existing architecture patterns, making the integration maintainable and extensible for future enhancements. With proper implementation, MCP support will significantly expand the capabilities of agents while maintaining the clean, scalable architecture that currently exists.