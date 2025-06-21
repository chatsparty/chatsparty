#!/usr/bin/env python3
"""
Test script for the refactored MCP connection manager.
This will test the new clean architecture and proper async context management.
"""

from app.services.mcp.application.mcp_service import get_mcp_service
import asyncio
import logging
import os
import sys

# Add the backend app to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))


# Configure logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def test_mcp_connection():
    """Test MCP connection with the new architecture"""

    # Get the MCP service
    mcp_service = get_mcp_service()

    # Test URLs to try (in order of preference)
    test_servers = [
        "stdio://npx -y @upstash/context7-mcp@latest",
        "stdio://npx -y @modelcontextprotocol/server-weather",
        "stdio://python -m mcp_servers.weather",  # if installed locally
    ]

    for server_url in test_servers:
        logger.info(f"Testing MCP connection to: {server_url}")

        try:
            # Test connection with a shorter timeout to avoid hanging
            result = await asyncio.wait_for(
                mcp_service.test_connection(server_url),
                timeout=15.0
            )

            if result.success:
                logger.info("✅ Connection test successful!")
                if result.capabilities:
                    logger.info("Server capabilities discovered:")
                    logger.info(f"  - Tools: {len(result.capabilities.tools)}")
                    logger.info(
                        f"  - Resources: {len(result.capabilities.resources)}")
                    logger.info(
                        f"  - Prompts: {len(result.capabilities.prompts)}")
                    logger.info(
                        f"  - Server: {result.capabilities.server_info.name}")

                    # Test discovered capabilities
                    if result.capabilities.tools:
                        logger.info("Available tools:")
                        # Show first 3
                        for tool in result.capabilities.tools[:3]:
                            logger.info(f"  - {tool.name}: {tool.description}")

                return True
            else:
                logger.error(f"❌ Connection test failed: {result.error}")

        except asyncio.TimeoutError:
            logger.warning(f"⏰ Connection test timed out for: {server_url}")
        except Exception as e:
            logger.error(f"❌ Connection test error: {e}")

    logger.error("All connection tests failed")
    return False


async def test_connection_cleanup():
    """Test that connections are properly cleaned up"""

    mcp_service = get_mcp_service()

    logger.info("Testing connection cleanup...")

    try:
        # Create a connection
        await mcp_service.connect_to_server(
            "test_cleanup",
            "stdio://npx -y @modelcontextprotocol/server-weather"
        )

        logger.info("✅ Connection created successfully")

        # Verify it exists
        existing = mcp_service.get_connection("test_cleanup")
        if existing:
            logger.info("✅ Connection can be retrieved")
        else:
            logger.error("❌ Connection not found after creation")
            return False

        # Clean it up
        await mcp_service.disconnect_from_server("test_cleanup")
        logger.info("✅ Connection cleanup initiated")

        # Verify it's gone
        existing = mcp_service.get_connection("test_cleanup")
        if not existing:
            logger.info("✅ Connection properly cleaned up")
            return True
        else:
            logger.error("❌ Connection still exists after cleanup")
            return False

    except Exception as e:
        logger.error(f"❌ Cleanup test failed: {e}")
        return False


async def main():
    """Main test function"""
    logger.info("🧪 Starting MCP connection manager tests...")

    try:
        # Test 1: Basic connection test
        logger.info("=" * 50)
        logger.info("Test 1: Basic MCP Connection Test")
        logger.info("=" * 50)

        connection_success = await test_mcp_connection()

        # Test 2: Connection cleanup
        logger.info("=" * 50)
        logger.info("Test 2: Connection Cleanup Test")
        logger.info("=" * 50)

        cleanup_success = await test_connection_cleanup()

        # Summary
        logger.info("=" * 50)
        logger.info("Test Summary")
        logger.info("=" * 50)
        logger.info(
            f"Connection Test: {'✅ PASS' if connection_success else '❌ FAIL'}")
        logger.info(
            f"Cleanup Test: {'✅ PASS' if cleanup_success else '❌ FAIL'}")

        if connection_success and cleanup_success:
            logger.info("🎉 All tests passed! MCP refactoring successful.")
            return 0
        else:
            logger.error("❌ Some tests failed. Check the logs above.")
            return 1

    except Exception as e:
        logger.error(f"❌ Test suite failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
