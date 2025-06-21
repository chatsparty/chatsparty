import logging
from typing import Any, Dict, List

from mcp.client.session import ClientSession

from ..domain.entities import MCPResourceContent
from ..domain.interfaces import IResourceService

logger = logging.getLogger(__name__)


class ResourceService(IResourceService):
    """Service for managing MCP resources"""

    async def get_resource(
        self,
        session: ClientSession,
        resource_uri: str
    ) -> MCPResourceContent:
        """Get resource from MCP server"""
        try:
            # Convert string URI to proper format for MCP
            result = await session.read_resource(resource_uri)

            # Process the resource content
            processed_content = self._process_resource_content(result)

            return MCPResourceContent(
                success=True,
                contents=processed_content
            )

        except Exception as e:
            logger.error(f"Failed to get resource {resource_uri}: {e}")
            return MCPResourceContent(
                success=False,
                error=str(e)
            )

    def _process_resource_content(self, result: Any) -> List[Dict[str, Any]]:
        """Process resource content based on type"""
        processed_content = []

        if not hasattr(result, 'contents'):
            return [{'type': 'text', 'content': str(result)}]

        for content in result.contents:
            if hasattr(content, 'type'):
                if content.type == 'text':
                    processed_content.append({
                        'type': 'text',
                        'text': getattr(content, 'text', str(content))
                    })
                elif content.type == 'image':
                    processed_content.append({
                        'type': 'image',
                        'data': getattr(content, 'data', ''),
                        'mime_type': getattr(content, 'mime_type', 'image/png')
                    })
                else:
                    processed_content.append({
                        'type': 'unknown',
                        'content': str(content)
                    })
            else:
                # Fallback for content without type attribute
                processed_content.append({
                    'type': 'text',
                    'content': str(content)
                })

        return processed_content
