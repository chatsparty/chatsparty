import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncContextManager, Dict, Optional

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

logger = logging.getLogger(__name__)


class StatelessConnectionManager:
    """
    Stateless connection manager that creates fresh connections for each operation.
    This works with MCP library's intended design of context-managed connections.
    """

    def __init__(self):
        # We don't store persistent connections - just connection configs
        self.connection_configs: Dict[str, Dict[str, Any]] = {}
        self._config_lock = asyncio.Lock()

    async def register_connection(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> None:
        """Register a connection configuration for later use"""
        async with self._config_lock:
            self.connection_configs[connection_id] = {
                'server_url': server_url,
                'server_config': server_config or {}
            }
            logger.info(f"Registered connection config: {connection_id}")

    async def unregister_connection(self, connection_id: str) -> None:
        """Unregister a connection configuration"""
        async with self._config_lock:
            if connection_id in self.connection_configs:
                del self.connection_configs[connection_id]
                logger.info(f"Unregistered connection config: {connection_id}")

    def is_registered(self, connection_id: str) -> bool:
        """Check if a connection is registered"""
        return connection_id in self.connection_configs

    @asynccontextmanager
    async def get_session(self, connection_id: str) -> AsyncContextManager[ClientSession]:
        """Get a fresh session for the given connection ID"""
        if connection_id not in self.connection_configs:
            raise ValueError(f"Connection {connection_id} not registered")

        config = self.connection_configs[connection_id]
        server_url = config['server_url']
        server_config = config['server_config']

        # Create fresh connection using proper context management
        async with self._create_fresh_session(connection_id, server_url, server_config) as session:
            yield session

    @asynccontextmanager
    async def _create_fresh_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Dict[str, Any]
    ) -> AsyncContextManager[ClientSession]:
        """Create a fresh session with proper context management"""

        if server_url.startswith('stdio://'):
            async with self._create_stdio_session(connection_id, server_url, server_config) as session:
                yield session
        else:
            raise ValueError(f"Unsupported URL format: {server_url}")

    @asynccontextmanager
    async def _create_stdio_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Dict[str, Any]
    ) -> AsyncContextManager[ClientSession]:
        """Create a stdio session with proper MCP context management"""

        command_parts = server_url.replace('stdio://', '').split()
        if not command_parts:
            raise ValueError("Stdio URL must contain command")

        command = command_parts[0]
        args = command_parts[1:] if len(command_parts) > 1 else []

        server_params = StdioServerParameters(command=command, args=args)

        logger.info(f"Creating fresh stdio session for: {connection_id}")

        # Use the MCP library's intended pattern
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                # Initialize the session
                is_package_download = any(
                    keyword in server_url.lower()
                    for keyword in ['npx', 'npm', 'yarn', 'pnpm', 'pip', 'pipx']
                )
                init_timeout = 30.0 if is_package_download else 10.0

                try:
                    logger.info(f"Initializing fresh session: {connection_id}")
                    await asyncio.wait_for(session.initialize(), timeout=init_timeout)
                    logger.info(f"Fresh session ready: {connection_id}")

                    # Yield the initialized session
                    yield session

                except asyncio.TimeoutError:
                    logger.error(
                        f"Session initialization timed out: {connection_id}")
                    raise ValueError(
                        f"MCP server initialization timed out: {connection_id}")
                except Exception as e:
                    logger.error(
                        f"Session initialization failed: {connection_id}: {e}")
                    raise ValueError(
                        f"MCP server initialization failed: {str(e)}")

    async def test_connection(
        self,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Test a connection without storing it"""
        test_id = f"test_{id(server_url)}"

        try:
            # Create a temporary fresh session for testing
            async with self._create_fresh_session(test_id, server_url, server_config or {}) as session:
                logger.info("Testing session - discovering capabilities...")

                capabilities = {
                    'tools': [],
                    'resources': [],
                    'prompts': [],
                    'server_info': {'name': 'Unknown', 'version': 'Unknown'}
                }

                # Test basic operations
                try:
                    tools_response = await asyncio.wait_for(session.list_tools(), timeout=5.0)
                    capabilities['tools'] = [
                        {
                            'name': tool.name,
                            'description': tool.description,
                            'input_schema': getattr(tool, 'input_schema', {})
                        }
                        for tool in tools_response.tools
                    ]
                    logger.info(f"Found {len(capabilities['tools'])} tools")
                except Exception as e:
                    logger.warning(f"Failed to list tools: {e}")

                try:
                    resources_response = await asyncio.wait_for(session.list_resources(), timeout=5.0)
                    capabilities['resources'] = [
                        {
                            'uri': resource.uri,
                            'name': resource.name,
                            'description': resource.description,
                            'mime_type': getattr(resource, 'mime_type', None)
                        }
                        for resource in resources_response.resources
                    ]
                    logger.info(
                        f"Found {len(capabilities['resources'])} resources")
                except Exception as e:
                    logger.warning(f"Failed to list resources: {e}")

                try:
                    prompts_response = await asyncio.wait_for(session.list_prompts(), timeout=5.0)
                    capabilities['prompts'] = [
                        {
                            'name': prompt.name,
                            'description': prompt.description,
                            'arguments': prompt.arguments
                        }
                        for prompt in prompts_response.prompts
                    ]
                    logger.info(
                        f"Found {len(capabilities['prompts'])} prompts")
                except Exception as e:
                    logger.warning(f"Failed to list prompts: {e}")

                return {
                    'success': True,
                    'capabilities': capabilities
                }

        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
