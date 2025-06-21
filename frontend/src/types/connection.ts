export interface ModelConnection {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // MCP-specific fields
  mcp_server_url?: string;
  mcp_server_config?: Record<string, any>;
  available_tools?: MCPTool[];
  mcp_capabilities?: MCPCapabilities;
}

export interface CreateConnectionRequest {
  name: string;
  description?: string;
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  // MCP-specific fields
  mcp_server_url?: string;
  mcp_server_config?: Record<string, any>;
  available_tools?: MCPTool[];
  mcp_capabilities?: MCPCapabilities;
}

export interface UpdateConnectionRequest extends Partial<CreateConnectionRequest> {
  is_active?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

// MCP-specific types
export interface MCPTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mime_type: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: Record<string, any>;
}

export interface MCPCapabilities {
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  server_info: {
    name: string;
    version: string;
    protocol_version: string;
  };
}

export interface MCPTestRequest {
  server_url: string;
  server_config?: Record<string, any>;
}