import asyncio
import logging
from contextlib import AsyncExitStack
from typing import Any, Dict, Optional

from mcp.client.session import ClientSession
from mcp.client.sse import sse_client
from mcp.client.stdio import StdioServerParameters, stdio_client

from ..domain.interfaces import IConnectionManager

logger = logging.getLogger(__name__)


class ConnectionManager(IConnectionManager):
    """Manages MCP server connections and disconnections"""

    def __init__(self):
        self.active_connections: Dict[str, ClientSession] = {}
        self.active_stacks: Dict[str, AsyncExitStack] = {}
        self._connection_lock = asyncio.Lock()

    async def connect(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Connect to MCP server"""
        async with self._connection_lock:
            try:
                # Close existing connection if any
                if connection_id in self.active_connections:
                    await self.disconnect(connection_id)

                session = await self._create_session(
                    connection_id, server_url, server_config
                )

                self.active_connections[connection_id] = session
                logger.info(
                    f"Successfully connected to MCP server: "
                    f"{connection_id} ({server_url})"
                )

                return session

            except Exception as e:
                logger.error(
                    f"Failed to connect to MCP server {connection_id}: {e}"
                )
                # Ensure cleanup on failure
                await self._cleanup_connection_resources(connection_id)
                raise

    async def disconnect(self, connection_id: str) -> None:
        """Disconnect from MCP server"""
        async with self._connection_lock:
            await self._cleanup_connection_resources(connection_id)

    def get_connection(self, connection_id: str) -> Optional[ClientSession]:
        """Get existing MCP connection"""
        return self.active_connections.get(connection_id)

    async def cleanup_all(self) -> None:
        """Cleanup all active connections"""
        connection_ids = list(self.active_connections.keys())
        for connection_id in connection_ids:
            try:
                await self.disconnect(connection_id)
            except Exception as e:
                logger.error(
                    f"Failed to cleanup connection {connection_id}: {e}"
                )

    async def _create_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create session based on server URL type"""

        if server_url.startswith('stdio://'):
            return await self._create_stdio_session(
                connection_id, server_url, server_config
            )
        elif server_url.startswith(('http://', 'https://')):
            return await self._create_http_session(
                connection_id, server_url, server_config
            )
        elif server_url.startswith(('ws://', 'wss://')):
            return await self._create_websocket_session(
                connection_id, server_url, server_config
            )
        elif server_config and 'command' in server_config:
            return await self._create_command_session(
                connection_id, server_config
            )
        else:
            raise ValueError(
                f"Unsupported MCP server URL format: {server_url}"
            )

    async def _create_stdio_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create stdio session with proper context management"""
        command_parts = server_url.replace('stdio://', '').split()
        if not command_parts:
            raise ValueError("Stdio URL must contain command")

        command = command_parts[0]
        args = command_parts[1:] if len(command_parts) > 1 else []

        server_params = StdioServerParameters(command=command, args=args)

        # Create an AsyncExitStack to manage the context lifecycle
        stack = AsyncExitStack()
        self.active_stacks[connection_id] = stack

        try:
            # Use the stack to manage the stdio_client context
            read_stream, write_stream = await stack.enter_async_context(
                stdio_client(server_params)
            )

            session = ClientSession(read_stream, write_stream)

            # Detect package download commands for longer timeout
            is_package_download = any(
                keyword in server_url.lower()
                for keyword in ['npx', 'npm', 'yarn', 'pnpm', 'pip', 'pipx']
            )
            init_timeout = 60.0 if is_package_download else 15.0

            await self._initialize_session(
                session, connection_id, init_timeout, is_package_download
            )

            logger.info(f"Connected to stdio MCP server: {connection_id}")
            return session

        except Exception as e:
            # Clean up the stack on error
            await self._cleanup_connection_resources(connection_id)
            raise e

    async def _create_http_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create HTTP/SSE session"""
        headers = server_config.get('headers', {}) if server_config else {}
        timeout = server_config.get('timeout', 5) if server_config else 5

        # For HTTP sessions, we also need to manage the context
        stack = AsyncExitStack()
        self.active_stacks[connection_id] = stack

        try:
            # sse_client returns streams, not a session
            read_stream, write_stream = await stack.enter_async_context(
                sse_client(server_url, headers=headers, timeout=timeout)
            )

            session = ClientSession(read_stream, write_stream)

            logger.info(f"Connected to HTTP/SSE MCP server: {connection_id}")
            return session
        except Exception as e:
            await self._cleanup_connection_resources(connection_id)
            raise e

    async def _create_websocket_session(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create WebSocket session (converted to HTTP/SSE)"""
        # Convert WebSocket URL to HTTP/SSE
        http_url = server_url.replace(
            'ws://', 'http://'
        ).replace('wss://', 'https://')

        return await self._create_http_session(
            connection_id, http_url, server_config
        )

    async def _create_command_session(
        self,
        connection_id: str,
        server_config: Dict[str, Any]
    ) -> ClientSession:
        """Create session from command config"""
        command_input = server_config['command']
        if isinstance(command_input, str):
            command_parts = command_input.split()
        else:
            command_parts = command_input

        if not command_parts:
            raise ValueError("Command cannot be empty")

        command = command_parts[0]
        args = command_parts[1:] if len(command_parts) > 1 else []

        server_params = StdioServerParameters(command=command, args=args)

        # Use AsyncExitStack for proper context management
        stack = AsyncExitStack()
        self.active_stacks[connection_id] = stack

        try:
            read_stream, write_stream = await stack.enter_async_context(
                stdio_client(server_params)
            )

            session = ClientSession(read_stream, write_stream)

            await asyncio.wait_for(session.initialize(), timeout=10.0)
            logger.info(
                f"Successfully initialized MCP session from config: "
                f"{connection_id}"
            )

            logger.info(
                f"Connected to stdio MCP server from config: {connection_id}"
            )
            return session

        except Exception as e:
            await self._cleanup_connection_resources(connection_id)
            raise e

    async def _initialize_session(
        self,
        session: ClientSession,
        connection_id: str,
        timeout: float,
        is_package_download: bool = False
    ) -> None:
        """Initialize session with timeout handling and proper MCP options"""
        try:
            logger.info(
                f"Initializing MCP session with {timeout}s timeout: "
                f"{connection_id}"
            )

            # Initialize the MCP session
            init_result = await asyncio.wait_for(
                session.initialize(),
                timeout=timeout
            )

            logger.info(
                f"Successfully initialized MCP session: {connection_id}"
            )
            logger.info(f"Server capabilities: {init_result}")

        except asyncio.TimeoutError:
            logger.warning(
                f"MCP session initialization timed out after {timeout}s "
                f"for: {connection_id}"
            )
            timeout_msg = (
                f"MCP server initialization timed out after {timeout} seconds"
            )
            if is_package_download:
                timeout_msg += (
                    ". This might be due to slow package download "
                    "or installation."
                )
            raise ValueError(timeout_msg)
        except Exception as init_error:
            logger.error(
                f"MCP session initialization failed for {connection_id}: "
                f"{init_error}",
                exc_info=True
            )
            raise ValueError(
                f"MCP server initialization failed: {str(init_error)}"
            )

    async def _cleanup_connection_resources(self, connection_id: str) -> None:
        """Clean up all resources for a connection"""
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            logger.info(
                f"Removed session from active connections: {connection_id}")

        # Clean up the async exit stack (this handles all context managers)
        if connection_id in self.active_stacks:
            try:
                stack = self.active_stacks[connection_id]
                await stack.aclose()
                del self.active_stacks[connection_id]
                logger.info(
                    f"Cleaned up async context stack for: {connection_id}"
                )
            except Exception as e:
                logger.error(
                    f"Error cleaning up async stack for {connection_id}: {e}"
                )
                # Remove it anyway to prevent memory leaks
                self.active_stacks.pop(connection_id, None)
