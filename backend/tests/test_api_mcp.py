#!/usr/bin/env python3

import asyncio
import logging

from app.services.mcp.mcp_client_service import MCPClientService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def test_mcp_api():
    """Test MCP API directly"""
    print("🧪 Testing MCP API directly...")

    try:
        mcp_client_service = MCPClientService()

        server_url = "stdio://npx -y @upstash/context7-mcp@latest"
        server_config = {}

        print(f"Testing connection to: {server_url}")

        test_result = await mcp_client_service.test_connection(
            server_url,
            server_config
        )

        print(f"✅ Test result: {test_result}")

        if test_result.get('success'):
            capabilities = test_result.get('capabilities', {})

            # Test the extraction logic that was causing issues
            print(f"Raw capabilities: {capabilities}")
            print(f"Tools type: {type(capabilities.get('tools', []))}")
            print(f"Tools: {capabilities.get('tools', [])}")

            # This is the logic we fixed
            available_tools = [tool['name'] for tool in capabilities.get(
                "tools", [])] if capabilities else []
            print(f"✅ Available tools: {available_tools}")

        else:
            print(f"❌ Test failed: {test_result.get('error')}")

    except Exception as e:
        logger.error(f"❌ Test failed with exception: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_mcp_api())
