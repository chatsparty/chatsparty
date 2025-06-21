import asyncio
import logging
from typing import Any, Dict, Optional

from mcp.client.session import ClientSession
from mcp.client.sse import sse_client
from mcp.client.stdio import StdioServerParameters, stdio_client

from ..domain.interfaces import IConnectionManager

logger = logging.getLogger(__name__)


class SimpleConnectionManager(IConnectionManager):
    """Simplified connection manager that works with MCP's async patterns"""

    def __init__(self):
        self.active_sessions: Dict[str, ClientSession] = {}
        self._connection_lock = asyncio.Lock()

    async def connect(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Connect to MCP server using direct context manager approach"""
        async with self._connection_lock:
            try:
                # Close existing connection if any
                if connection_id in self.active_sessions:
                    await self.disconnect(connection_id)

                session = await self._create_session_direct(
                    connection_id, server_url, server_config
                )

                self.active_sessions[connection_id] = session
                logger.info(
                    f"Successfully connected to MCP server: "
                    f"{connection_id} ({server_url})"
                )

                return session

            except Exception as e:
                logger.error(
                    f"Failed to connect to MCP server {connection_id}: {e}"
                )
                # Remove from active sessions on failure
                self.active_sessions.pop(connection_id, None)
                raise

    async def disconnect(self, connection_id: str) -> None:
        """Disconnect from MCP server"""
        async with self._connection_lock:
            if connection_id in self.active_sessions:
                # Just remove from tracking - the session will be cleaned up
                # when the context manager exits
                del self.active_sessions[connection_id]
                logger.info(f"Disconnected from MCP server: {connection_id}")

    def get_connection(self, connection_id: str) -> Optional[ClientSession]:
        """Get existing MCP connection"""
        return self.active_sessions.get(connection_id)

    async def cleanup_all(self) -> None:
        """Cleanup all active connections"""
        connection_ids = list(self.active_sessions.keys())
        for connection_id in connection_ids:
            try:
                await self.disconnect(connection_id)
            except Exception as e:
                logger.error(
                    f"Failed to cleanup connection {connection_id}: {e}"
                )

    async def _create_session_direct(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create session using direct MCP library patterns"""

        if server_url.startswith('stdio://'):
            return await self._create_stdio_session_direct(
                connection_id, server_url, server_config
            )
        else:
            raise ValueError(
                f"Only stdio connections supported in simple manager: {server_url}"
            )

    async def _create_stdio_session_direct(
        self,
        connection_id: str,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> ClientSession:
        """Create stdio session using direct context manager pattern"""
        command_parts = server_url.replace('stdio://', '').split()
        if not command_parts:
            raise ValueError("Stdio URL must contain command")

        command = command_parts[0]
        args = command_parts[1:] if len(command_parts) > 1 else []

        server_params = StdioServerParameters(command=command, args=args)

        # Use the MCP library's recommended pattern
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                # Detect package download commands for longer timeout
                is_package_download = any(
                    keyword in server_url.lower()
                    for keyword in ['npx', 'npm', 'yarn', 'pnpm', 'pip', 'pipx']
                )
                init_timeout = 30.0 if is_package_download else 10.0

                try:
                    logger.info(
                        f"Initializing MCP session with {init_timeout}s timeout: "
                        f"{connection_id}"
                    )
                    await asyncio.wait_for(session.initialize(), timeout=init_timeout)
                    logger.info(
                        f"Successfully initialized MCP session: {connection_id}"
                    )

                    # Return the session (it will stay alive as long as
                    # the context managers are active)
                    return session

                except asyncio.TimeoutError:
                    logger.warning(
                        f"MCP session initialization timed out after {init_timeout}s "
                        f"for: {connection_id}"
                    )
                    timeout_msg = (
                        f"MCP server initialization timed out after {init_timeout} seconds"
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
