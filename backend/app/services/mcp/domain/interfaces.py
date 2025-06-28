from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from mcp.client.session import ClientSession

from .entities import (
    MCPCapabilities,
    MCPPromptResult,
    MCPResourceContent,
    MCPTestResult,
    MCPToolResult,
)


class IConnectionManager(ABC):
    """Interface for managing MCP connections"""

    @abstractmethod
    async def connect(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Connect to MCP server"""
        pass

    @abstractmethod
    async def disconnect(self, connection_id: str) -> None:
        """Disconnect from MCP server"""
        pass

    @abstractmethod
    def get_connection(self, connection_id: str) -> Optional[ClientSession]:
        """Get existing connection"""
        pass

    @abstractmethod
    async def cleanup_all(self) -> None:
        """Cleanup all connections"""
        pass


class ICapabilityService(ABC):
    """Interface for discovering MCP server capabilities"""

    @abstractmethod
    async def discover_capabilities(
        self,
        session: ClientSession
    ) -> MCPCapabilities:
        """Discover server capabilities"""
        pass


class IToolService(ABC):
    """Interface for executing MCP tools"""

    @abstractmethod
    async def execute_tool(
        self,
        session: ClientSession,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> MCPToolResult:
        """Execute tool on MCP server"""
        pass


class IResourceService(ABC):
    """Interface for managing MCP resources"""

    @abstractmethod
    async def get_resource(
        self,
        session: ClientSession,
        resource_uri: str
    ) -> MCPResourceContent:
        """Get resource from MCP server"""
        pass


class IPromptService(ABC):
    """Interface for managing MCP prompts"""

    @abstractmethod
    async def get_prompt(
        self,
        session: ClientSession,
        prompt_name: str,
        arguments: Optional[Dict[str, Any]] = None
    ) -> MCPPromptResult:
        """Get prompt from MCP server"""
        pass


class ITestService(ABC):
    """Interface for testing MCP connections"""

    @abstractmethod
    async def test_connection(
        self,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> MCPTestResult:
        """Test connection to MCP server"""
        pass
