import asyncio
import logging
from typing import List

from mcp.client.session import ClientSession

from ..domain.entities import (
    MCPCapabilities,
    MCPPrompt,
    MCPResource,
    MCPServerInfo,
    MCPTool,
)
from ..domain.interfaces import ICapabilityService

logger = logging.getLogger(__name__)


class CapabilityService(ICapabilityService):
    """Service for discovering MCP server capabilities"""

    async def discover_capabilities(
        self,
        session: ClientSession
    ) -> MCPCapabilities:
        """Discover server capabilities (tools, resources, prompts)"""
        try:
            # Get server info
            server_info = await self._get_server_info(session)

            # Get tools
            tools = await self._get_tools(session)

            # Get resources
            resources = await self._get_resources(session)

            # Get prompts
            prompts = await self._get_prompts(session)

            return MCPCapabilities(
                tools=tools,
                resources=resources,
                prompts=prompts,
                server_info=server_info
            )

        except Exception as e:
            logger.error(f"Failed to discover capabilities: {e}")
            raise

    async def _get_server_info(self, session: ClientSession) -> MCPServerInfo:
        """Get server information with timeout"""
        try:
            # Note: Using proper MCP API methods
            if hasattr(session, 'get_server_info'):
                server_info = await asyncio.wait_for(
                    session.get_server_info(), timeout=5.0
                )
                return MCPServerInfo(
                    name=server_info.name,
                    version=server_info.version,
                    protocol_version=server_info.protocol_version
                )
            else:
                # Fallback for unknown server info
                return MCPServerInfo(
                    name='Unknown',
                    version='Unknown',
                    protocol_version='Unknown'
                )
        except asyncio.TimeoutError:
            logger.warning("Timeout getting server info")
            return MCPServerInfo(
                name='Unknown',
                version='Unknown',
                protocol_version='Unknown'
            )
        except Exception as e:
            logger.warning(f"Failed to get server info: {e}")
            return MCPServerInfo(
                name='Unknown',
                version='Unknown',
                protocol_version='Unknown'
            )

    async def _get_tools(self, session: ClientSession) -> List[MCPTool]:
        """Get available tools with timeout"""
        try:
            tools_response = await asyncio.wait_for(
                session.list_tools(), timeout=5.0
            )
            return [
                MCPTool(
                    name=tool.name,
                    description=tool.description,
                    input_schema=getattr(tool, 'input_schema', {})
                )
                for tool in tools_response.tools
            ]
        except asyncio.TimeoutError:
            logger.warning("Timeout listing tools")
            return []
        except Exception as e:
            logger.warning(f"Failed to list tools: {e}")
            return []

    async def _get_resources(self, session: ClientSession) -> List[MCPResource]:
        """Get available resources with timeout"""
        try:
            resources_response = await asyncio.wait_for(
                session.list_resources(), timeout=5.0
            )
            return [
                MCPResource(
                    uri=resource.uri,
                    name=resource.name,
                    description=resource.description,
                    mime_type=getattr(resource, 'mime_type', None)
                )
                for resource in resources_response.resources
            ]
        except asyncio.TimeoutError:
            logger.warning("Timeout listing resources")
            return []
        except Exception as e:
            logger.warning(f"Failed to list resources: {e}")
            return []

    async def _get_prompts(self, session: ClientSession) -> List[MCPPrompt]:
        """Get available prompts with timeout"""
        try:
            prompts_response = await asyncio.wait_for(
                session.list_prompts(), timeout=5.0
            )
            return [
                MCPPrompt(
                    name=prompt.name,
                    description=prompt.description,
                    arguments=prompt.arguments
                )
                for prompt in prompts_response.prompts
            ]
        except asyncio.TimeoutError:
            logger.warning("Timeout listing prompts")
            return []
        except Exception as e:
            logger.warning(f"Failed to list prompts: {e}")
            return []
