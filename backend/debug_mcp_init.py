#!/usr/bin/env python3
"""
Debug script to isolate the MCP session initialization issue.
"""

import asyncio
import logging
import sys
from typing import List

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def debug_mcp_session():
    """Debug MCP session initialization step by step"""

    logger.info("Starting MCP session debug...")

    # Test with Context7 server since we know it starts
    server_url = "stdio://npx -y @upstash/context7-mcp@latest"

    try:
        command_parts = server_url.replace('stdio://', '').split()
        command = command_parts[0]
        args: List[str] = command_parts[1:]

        logger.info(f"Command: {command}")
        logger.info(f"Args: {args}")

        server_params = StdioServerParameters(command=command, args=args)

        logger.info("Creating stdio client...")

        async with stdio_client(server_params) as (read_stream, write_stream):
            logger.info("✅ stdio_client context entered successfully")

            logger.info("Creating ClientSession...")
            session = ClientSession(read_stream, write_stream)
            logger.info("✅ ClientSession created")

            logger.info("Starting session initialization...")

            # Try initialize with debug info
            try:
                logger.info("Calling session.initialize()...")

                # Create a task for initialization so we can monitor it
                init_task = asyncio.create_task(session.initialize())

                # Wait with periodic logging
                for i in range(30):  # 30 seconds total
                    try:
                        await asyncio.wait_for(
                            asyncio.shield(init_task), timeout=1.0
                        )
                        logger.info("✅ Session initialization completed!")
                        break
                    except asyncio.TimeoutError:
                        logger.info(f"Still initializing... ({i+1}s)")
                        if init_task.done():
                            error_msg = (
                                "Task completed but timed out - checking result"
                            )
                            logger.error(error_msg)
                            try:
                                result = init_task.result()
                                logger.info(f"Task result: {result}")
                                break
                            except Exception as e:
                                logger.error(f"Task failed: {e}")
                                raise
                else:
                    logger.error("❌ Initialization timed out after 30 seconds")
                    init_task.cancel()
                    return False

                logger.info("Testing basic session operations...")

                # Try listing tools as a basic operation
                try:
                    logger.info("Listing tools...")
                    tools_result = await asyncio.wait_for(
                        session.list_tools(), timeout=5.0
                    )
                    logger.info(f"✅ Found {len(tools_result.tools)} tools")
                    for tool in tools_result.tools[:3]:
                        logger.info(f"  - {tool.name}: {tool.description}")
                except Exception as e:
                    logger.error(f"❌ Failed to list tools: {e}")

                return True

            except Exception as init_error:
                logger.error(f"❌ Session initialization failed: {init_error}")
                return False

    except Exception as e:
        logger.error(f"❌ Failed to create stdio client: {e}")
        return False


async def main():
    """Main debug function"""
    logger.info("🔍 Starting MCP initialization debug...")

    try:
        success = await debug_mcp_session()
        if success:
            logger.info("🎉 Debug completed successfully!")
            return 0
        else:
            logger.error("❌ Debug revealed issues")
            return 1
    except Exception as e:
        logger.error(f"❌ Debug failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
