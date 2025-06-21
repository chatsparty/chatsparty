import logging
from typing import Any, Dict, Optional

from ..domain.entities import (
    MCPCapabilities,
    MCPPrompt,
    MCPPromptResult,
    MCPResource,
    MCPResourceContent,
    MCPServerInfo,
    MCPTestResult,
    MCPTool,
    MCPToolResult,
)
from ..infrastructure import (
    CapabilityService,
    PromptService,
    ResourceService,
    ToolService,
)
from ..infrastructure.stateless_connection_manager import StatelessConnectionManager

logger = logging.getLogger(__name__)


class MCPService:
    """Main MCP service using stateless connection approach"""

    def __init__(self):
        # Use stateless connection manager that works with MCP's design
        self.connection_manager = StatelessConnectionManager()
        self.capability_service = CapabilityService()
        self.tool_service = ToolService()
        self.resource_service = ResourceService()
        self.prompt_service = PromptService()

    async def register_connection(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> None:
        """Register a connection configuration"""
        await self.connection_manager.register_connection(
            connection_id, server_url, server_config
        )

    async def unregister_connection(self, connection_id: str) -> None:
        """Unregister a connection configuration"""
        await self.connection_manager.unregister_connection(connection_id)

    def is_connection_registered(self, connection_id: str) -> bool:
        """Check if a connection is registered"""
        return self.connection_manager.is_registered(connection_id)

    async def discover_capabilities(
        self,
        connection_id: str
    ) -> MCPCapabilities:
        """Discover server capabilities using fresh session"""
        async with self.connection_manager.get_session(connection_id) as session:
            return await self.capability_service.discover_capabilities(session)

    async def execute_tool(
        self,
        connection_id: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> MCPToolResult:
        """Execute tool using fresh session"""
        async with self.connection_manager.get_session(connection_id) as session:
            return await self.tool_service.execute_tool(
                session, tool_name, arguments
            )

    async def get_resource(
        self,
        connection_id: str,
        resource_uri: str
    ) -> MCPResourceContent:
        """Get resource using fresh session"""
        async with self.connection_manager.get_session(connection_id) as session:
            return await self.resource_service.get_resource(session, resource_uri)

    async def get_prompt(
        self,
        connection_id: str,
        prompt_name: str,
        arguments: Optional[Dict[str, Any]] = None
    ) -> MCPPromptResult:
        """Get prompt using fresh session"""
        async with self.connection_manager.get_session(connection_id) as session:
            return await self.prompt_service.get_prompt(
                session, prompt_name, arguments
            )

    async def test_connection(
        self,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> MCPTestResult:
        """Test connection using stateless approach"""
        try:
            result = await self.connection_manager.test_connection(
                server_url, server_config
            )

            if result['success']:
                # Convert dict capabilities to domain entities
                caps_data = result['capabilities']

                tools = [
                    MCPTool(
                        name=tool['name'],
                        description=tool['description'],
                        input_schema=tool.get('input_schema', {})
                    )
                    for tool in caps_data['tools']
                ]

                resources = [
                    MCPResource(
                        uri=resource['uri'],
                        name=resource['name'],
                        description=resource['description'],
                        mime_type=resource.get('mime_type')
                    )
                    for resource in caps_data['resources']
                ]

                prompts = [
                    MCPPrompt(
                        name=prompt['name'],
                        description=prompt['description'],
                        arguments=prompt['arguments']
                    )
                    for prompt in caps_data['prompts']
                ]

                server_info = MCPServerInfo(
                    name=caps_data['server_info']['name'],
                    version=caps_data['server_info']['version'],
                    protocol_version=caps_data['server_info'].get(
                        'protocol_version', 'Unknown')
                )

                capabilities = MCPCapabilities(
                    tools=tools,
                    resources=resources,
                    prompts=prompts,
                    server_info=server_info
                )

                return MCPTestResult(success=True, capabilities=capabilities)
            else:
                return MCPTestResult(success=False, error=result['error'])

        except Exception as e:
            logger.error(f"Test connection failed: {e}")
            return MCPTestResult(success=False, error=str(e))


# Singleton instance
_mcp_service = None


def get_mcp_service() -> MCPService:
    """Get the singleton MCP service"""
    global _mcp_service
    if _mcp_service is None:
        _mcp_service = MCPService()
    return _mcp_service
