#!/usr/bin/env python3

import asyncio
import logging

from app.services.mcp.mcp_client_service import MCPClientService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_api_route_logic():
    """Test the exact logic from the API route"""
    print("🧪 Testing API route logic...")

    try:
        # This simulates the exact code path in the API route
        mcp_client_service = MCPClientService()

        server_url = "stdio://npx -y @upstash/context7-mcp@latest"
        server_config = {}

        print(f"Testing connection: {server_url}")

        # This is the exact call from the API route
        test_result = await mcp_client_service.test_connection(
            server_url,
            server_config
        )

        print(f"Test result success: {test_result.get('success')}")
        print(f"Test result: {test_result}")

        if test_result.get('success'):
            capabilities = test_result.get('capabilities', {})
            print(f"Capabilities type: {type(capabilities)}")
            print(f"Tools in capabilities: {capabilities.get('tools', [])}")
            print(f"Tools type: {type(capabilities.get('tools', []))}")

            # This is the exact line that was causing the error in the API
            try:
                available_tools = [tool['name'] for tool in capabilities.get(
                    "tools", [])] if capabilities else []
                print(f"✅ Fixed logic works: {available_tools}")
            except Exception as e:
                print(f"❌ Fixed logic failed: {e}")

            # Let's also test the old broken logic to see if it would fail
            try:
                broken_tools = list(capabilities.get(
                    "tools", {}).keys()) if capabilities else []
                print(f"❌ Old logic unexpectedly worked: {broken_tools}")
            except Exception as e:
                print(f"✅ Old logic correctly fails: {e}")

        else:
            print(f"❌ Connection failed: {test_result.get('error')}")

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_api_route_logic())
