import logging
from typing import Any, Dict, List

from mcp.client.session import ClientSession

from ..domain.entities import MCPToolResult
from ..domain.interfaces import IToolService

logger = logging.getLogger(__name__)


class ToolService(IToolService):
    """Service for executing MCP tools"""

    async def execute_tool(
        self,
        session: ClientSession,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> MCPToolResult:
        """Execute tool on MCP server"""
        try:
            result = await session.call_tool(tool_name, arguments)

            # Process the result based on content type
            processed_result = self._process_tool_result(result)

            return MCPToolResult(
                success=True,
                result=processed_result,
                is_error=getattr(result, 'is_error', False)
            )

        except Exception as e:
            logger.error(f"Failed to execute tool {tool_name}: {e}")
            return MCPToolResult(
                success=False,
                error=str(e)
            )

    def _process_tool_result(self, result: Any) -> List[Dict[str, Any]]:
        """Process tool result based on content type"""
        processed_result = []

        if not hasattr(result, 'content'):
            return [{'type': 'text', 'text': str(result)}]

        for content in result.content:
            if hasattr(content, 'type'):
                if content.type == 'text':
                    processed_result.append({
                        'type': 'text',
                        'text': content.text
                    })
                elif content.type == 'image':
                    processed_result.append({
                        'type': 'image',
                        'data': getattr(content, 'data', ''),
                        'mime_type': getattr(content, 'mime_type', 'image/png')
                    })
                else:
                    processed_result.append({
                        'type': 'unknown',
                        'content': str(content)
                    })
            else:
                processed_result.append({
                    'type': 'text',
                    'text': str(content)
                })

        return processed_result
