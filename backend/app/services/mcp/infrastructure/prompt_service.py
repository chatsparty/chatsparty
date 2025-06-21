import logging
from typing import Any, Dict, List, Optional

from mcp.client.session import ClientSession

from ..domain.entities import MCPPromptResult
from ..domain.interfaces import IPromptService

logger = logging.getLogger(__name__)


class PromptService(IPromptService):
    """Service for managing MCP prompts"""

    async def get_prompt(
        self,
        session: ClientSession,
        prompt_name: str,
        arguments: Optional[Dict[str, Any]] = None
    ) -> MCPPromptResult:
        """Get prompt from MCP server"""
        try:
            result = await session.get_prompt(prompt_name, arguments or {})

            # Process prompt messages
            processed_messages = self._process_prompt_messages(result)

            return MCPPromptResult(
                success=True,
                description=getattr(result, 'description', None),
                messages=processed_messages
            )

        except Exception as e:
            logger.error(f"Failed to get prompt {prompt_name}: {e}")
            return MCPPromptResult(
                success=False,
                error=str(e)
            )

    def _process_prompt_messages(self, result: Any) -> List[Dict[str, Any]]:
        """Process prompt messages based on content"""
        processed_messages = []

        if not hasattr(result, 'messages'):
            return []

        for message in result.messages:
            content_items = []

            if hasattr(message, 'content'):
                for content in message.content:
                    if hasattr(content, 'type'):
                        if content.type == 'text':
                            content_items.append({
                                'type': 'text',
                                'text': getattr(content, 'text', str(content))
                            })
                        elif content.type == 'image':
                            content_items.append({
                                'type': 'image',
                                'data': getattr(content, 'data', ''),
                                'mime_type': getattr(
                                    content, 'mime_type', 'image/png'
                                )
                            })
                        else:
                            content_items.append({
                                'type': 'unknown',
                                'content': str(content)
                            })
                    else:
                        # Fallback for content without type
                        content_items.append({
                            'type': 'text',
                            'text': str(content)
                        })

            processed_messages.append({
                'role': getattr(message, 'role', 'assistant'),
                'content': content_items
            })

        return processed_messages
