import asyncio
import logging
from typing import Any, Dict, Optional

from ..domain.entities import MCPTestResult
from ..domain.interfaces import ICapabilityService, IConnectionManager, ITestService

logger = logging.getLogger(__name__)


class TestService(ITestService):
    """Service for testing MCP connections"""

    def __init__(
        self,
        connection_manager: IConnectionManager,
        capability_service: ICapabilityService
    ):
        self.connection_manager = connection_manager
        self.capability_service = capability_service

    async def test_connection(
        self,
        server_url: str,
        server_config: Optional[Dict[str, Any]] = None
    ) -> MCPTestResult:
        """Test connection to MCP server without storing it permanently"""
        test_connection_id = f"test_{id(server_url)}"

        try:
            logger.info(f"Testing MCP connection to: {server_url}")

            # Detect if this is a package download command for longer timeout
            is_package_download = any(
                keyword in server_url.lower()
                for keyword in ['npx', 'npm', 'yarn', 'pnpm', 'pip', 'pipx']
            )
            connection_timeout = 90.0 if is_package_download else 15.0

            # Connect with timeout protection
            logger.info(
                f"Using {connection_timeout}s timeout for connection test"
            )

            session = await asyncio.wait_for(
                self.connection_manager.connect(
                    test_connection_id, server_url, server_config
                ),
                timeout=connection_timeout
            )

            logger.info("Successfully connected, discovering capabilities...")

            # Discover capabilities with timeout protection
            capabilities = await asyncio.wait_for(
                self.capability_service.discover_capabilities(session),
                timeout=10.0
            )

            logger.info(
                f"Capabilities discovered: {len(capabilities.tools)} tools found"
            )

            # Clean up test connection
            logger.info("Cleaning up test connection...")
            await asyncio.wait_for(
                self.connection_manager.disconnect(test_connection_id),
                timeout=5.0
            )

            return MCPTestResult(
                success=True,
                capabilities=capabilities
            )

        except asyncio.TimeoutError:
            logger.error(f"MCP test connection timed out: {server_url}")
            # Force cleanup of test connection on timeout
            try:
                await self._force_cleanup_test_connection(test_connection_id)
            except Exception as cleanup_error:
                logger.error(
                    f"Failed to force cleanup test connection: "
                    f"{cleanup_error}"
                )

            timeout_msg = (
                f'Connection test timed out after {connection_timeout} '
                f'seconds.'
            )
            if is_package_download:
                timeout_msg += (
                    ' This might be due to slow package download '
                    'or network issues.'
                )

            return MCPTestResult(
                success=False,
                error=timeout_msg
            )

        except Exception as e:
            logger.error(
                f"MCP test connection failed: {str(e)}", exc_info=True
            )
            # Clean up failed test connection
            try:
                await self._force_cleanup_test_connection(test_connection_id)
            except Exception as cleanup_error:
                logger.error(
                    f"Failed to cleanup test connection: {cleanup_error}"
                )

            return MCPTestResult(
                success=False,
                error=str(e)
            )

    async def _force_cleanup_test_connection(
        self,
        test_connection_id: str
    ) -> None:
        """Force cleanup of test connection"""
        try:
            await self.connection_manager.disconnect(test_connection_id)
        except Exception as e:
            logger.warning(
                f"Failed to cleanup test connection {test_connection_id}: {e}"
            )
