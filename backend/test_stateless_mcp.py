#!/usr/bin/env python3
"""
Test the stateless MCP connection manager approach.
"""

from app.services.mcp.infrastructure.stateless_connection_manager import (
    StatelessConnectionManager,
)
import asyncio
import logging
import os
import sys

# Add the backend app to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def test_stateless_connection():
    """Test the stateless connection approach"""

    manager = StatelessConnectionManager()

    # Test with Context7 server
    server_url = "stdio://npx -y @upstash/context7-mcp@latest"

    logger.info("🧪 Testing stateless MCP connection...")

    try:
        # Test connection directly (no registration needed)
        result = await asyncio.wait_for(
            manager.test_connection(server_url),
            timeout=60.0
        )

        if result['success']:
            logger.info("✅ Stateless connection test successful!")
            capabilities = result['capabilities']
            logger.info(f"  - Tools: {len(capabilities['tools'])}")
            logger.info(f"  - Resources: {len(capabilities['resources'])}")
            logger.info(f"  - Prompts: {len(capabilities['prompts'])}")

            if capabilities['tools']:
                logger.info("Available tools:")
                for tool in capabilities['tools'][:3]:
                    logger.info(f"  - {tool['name']}: {tool['description']}")

            return True
        else:
            logger.error(f"❌ Connection failed: {result['error']}")
            return False

    except asyncio.TimeoutError:
        logger.error("❌ Test timed out")
        return False
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        return False


async def main():
    """Main test function"""
    logger.info("🔍 Testing stateless MCP connection approach...")

    try:
        success = await test_stateless_connection()
        if success:
            logger.info("🎉 Stateless approach works!")
            return 0
        else:
            logger.error("❌ Stateless approach failed")
            return 1
    except Exception as e:
        logger.error(f"❌ Test suite failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
