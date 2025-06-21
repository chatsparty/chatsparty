from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class ConnectionStatus(Enum):
    """Status of MCP connection"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


@dataclass
class MCPServerInfo:
    """MCP server information"""
    name: str
    version: str
    protocol_version: str


@dataclass
class MCPTool:
    """MCP tool definition"""
    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class MCPResource:
    """MCP resource definition"""
    uri: str
    name: str
    description: str
    mime_type: Optional[str] = None


@dataclass
class MCPPrompt:
    """MCP prompt definition"""
    name: str
    description: str
    arguments: List[Dict[str, Any]]


@dataclass
class MCPCapabilities:
    """MCP server capabilities"""
    tools: List[MCPTool]
    resources: List[MCPResource]
    prompts: List[MCPPrompt]
    server_info: MCPServerInfo


@dataclass
class MCPConnection:
    """MCP connection details"""
    connection_id: str
    server_url: str
    server_config: Optional[Dict[str, Any]]
    status: ConnectionStatus
    capabilities: Optional[MCPCapabilities] = None
    error_message: Optional[str] = None


@dataclass
class MCPToolResult:
    """Result of MCP tool execution"""
    success: bool
    result: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    is_error: bool = False


@dataclass
class MCPResourceContent:
    """MCP resource content"""
    success: bool
    contents: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


@dataclass
class MCPPromptResult:
    """MCP prompt result"""
    success: bool
    description: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


@dataclass
class MCPTestResult:
    """Result of MCP connection test"""
    success: bool
    capabilities: Optional[MCPCapabilities] = None
    error: Optional[str] = None
