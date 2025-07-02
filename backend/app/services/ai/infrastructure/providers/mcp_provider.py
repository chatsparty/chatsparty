from typing import List, Dict, Any, Optional
import json
import logging
from ....ai_core.entities import Message, ModelConfiguration
from ....ai_core.interfaces import ModelProviderInterface
from ....mcp.mcp_client_service import get_mcp_client_service
from .....models.database import Connection

logger = logging.getLogger(__name__)


class MCPProvider(ModelProviderInterface):
    """MCP provider implementing the unified provider interface"""
    
    def __init__(self):
        self.mcp_client_service = get_mcp_client_service()
    
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration,
        user_id: Optional[str] = None,
        is_supervisor_call: bool = False
    ) -> str:
        """
        Process chat completion with MCP tools integration.
        Since MCP doesn't provide LLM models directly, this method
        orchestrates tool execution and returns formatted results.
        """
        try:
            connection_id = model_config.connection_id
            if not connection_id:
                return "Error: No MCP connection ID provided"
            
            
            session = self.mcp_client_service.get_connection(connection_id)
            if not session:
                
                await self._ensure_connection(connection_id, model_config)
                session = self.mcp_client_service.get_connection(connection_id)
                
                if not session:
                    return "Error: Could not establish MCP connection"
            
            
            last_message = messages[-1] if messages else None
            if not last_message or last_message.role != "user":
                return "Error: No user message to process"
            
            user_input = last_message.content
            
            
            tool_request = self._parse_tool_request(user_input)
            
            if tool_request:
                
                result = await self.mcp_client_service.execute_tool(
                    connection_id=connection_id,
                    tool_name=tool_request['tool_name'],
                    arguments=tool_request['arguments']
                )
                
                if result['success']:
                    return self._format_tool_result(result['result'])
                else:
                    return f"Tool execution failed: {result.get('error', 'Unknown error')}"
            else:
                
                try:
                    capabilities = await self.mcp_client_service.discover_capabilities(connection_id)
                    return self._format_capabilities_response(capabilities, user_input)
                except Exception as e:
                    return f"Error discovering capabilities: {str(e)}"
            
        except Exception as e:
            logger.error(f"Error in MCP chat completion: {e}")
            return f"I encountered an error: {str(e)}"
    
    async def _ensure_connection(self, connection_id: str, model_config: ModelConfiguration):
        """Ensure MCP connection is established"""
        try:
            server_url = model_config.base_url
            if not server_url:
                raise ValueError("MCP server URL is required")
            
            
            server_config = None
            if hasattr(model_config, 'mcp_server_config') and model_config.mcp_server_config:
                server_config = model_config.mcp_server_config
            
            await self.mcp_client_service.connect_to_server(
                connection_id=connection_id,
                server_url=server_url,
                server_config=server_config
            )
            
        except Exception as e:
            logger.error(f"Failed to ensure MCP connection {connection_id}: {e}")
            raise
    
    def _parse_tool_request(self, user_input: str) -> Optional[Dict[str, Any]]:
        """Parse user input to detect tool execution requests"""
        
        user_input_lower = user_input.lower().strip()
        
        
        if user_input_lower.startswith("use tool "):
            parts = user_input[9:].split(" with ", 1)
            if len(parts) == 2:
                tool_name = parts[0].strip()
                try:
                    arguments = json.loads(parts[1].strip())
                    return {'tool_name': tool_name, 'arguments': arguments}
                except json.JSONDecodeError:
                    
                    args_str = parts[1].strip()
                    arguments = {}
                    for pair in args_str.split(','):
                        if '=' in pair:
                            key, value = pair.split('=', 1)
                            arguments[key.strip()] = value.strip()
                    return {'tool_name': tool_name, 'arguments': arguments}
        
        
        if user_input_lower.startswith("execute ") and "(" in user_input and ")" in user_input:
            cmd_part = user_input[8:].strip()
            paren_start = cmd_part.find("(")
            paren_end = cmd_part.rfind(")")
            
            if paren_start != -1 and paren_end != -1:
                tool_name = cmd_part[:paren_start].strip()
                args_str = cmd_part[paren_start+1:paren_end].strip()
                
                try:
                    arguments = json.loads(f"{{{args_str}}}") if args_str else {}
                    return {'tool_name': tool_name, 'arguments': arguments}
                except json.JSONDecodeError:
                    return {'tool_name': tool_name, 'arguments': {}}
        
        return None
    
    def _format_tool_result(self, result: List[Dict[str, Any]]) -> str:
        """Format tool execution result for display"""
        if not result:
            return "Tool executed successfully (no output)"
        
        formatted_parts = []
        for item in result:
            if item['type'] == 'text':
                formatted_parts.append(item['text'])
            elif item['type'] == 'image':
                formatted_parts.append(f"[Image: {item.get('mime_type', 'unknown format')}]")
            else:
                formatted_parts.append(f"[{item['type']}: {item.get('content', 'no content')}]")
        
        return "\n".join(formatted_parts)
    
    def _format_capabilities_response(self, capabilities: Dict[str, Any], user_input: str) -> str:
        """Format capabilities as a helpful response"""
        response_parts = []
        
        # Add context about the user's request
        if capabilities.get('server_info'):
            server_info = capabilities['server_info']
            response_parts.append(f"Connected to MCP server: {server_info.get('name', 'Unknown')} v{server_info.get('version', 'Unknown')}")
        
        
        tools = capabilities.get('tools', [])
        if tools:
            response_parts.append(f"\nAvailable tools ({len(tools)}):")
            for tool in tools[:10]:  
                response_parts.append(f"  - {tool['name']}: {tool.get('description', 'No description')}")
            
            if len(tools) > 10:
                response_parts.append(f"  ... and {len(tools) - 10} more tools")
            
            response_parts.append(f"\nTo use a tool, try: 'use tool <tool_name> with {{\"arg1\": \"value1\"}}'")
        
        
        resources = capabilities.get('resources', [])
        if resources:
            response_parts.append(f"\nAvailable resources ({len(resources)}):")
            for resource in resources[:5]:  
                response_parts.append(f"  - {resource.get('name', resource['uri'])}: {resource.get('description', 'No description')}")
            
            if len(resources) > 5:
                response_parts.append(f"  ... and {len(resources) - 5} more resources")
        
        
        prompts = capabilities.get('prompts', [])
        if prompts:
            response_parts.append(f"\nAvailable prompts ({len(prompts)}):")
            for prompt in prompts[:5]:  
                response_parts.append(f"  - {prompt['name']}: {prompt.get('description', 'No description')}")
            
            if len(prompts) > 5:
                response_parts.append(f"  ... and {len(prompts) - 5} more prompts")
        
        if not tools and not resources and not prompts:
            response_parts.append("No tools, resources, or prompts are available from this MCP server.")
        
        return "\n".join(response_parts)


class MCPAgentProvider:
    """Specialized provider for MCP-enabled agents"""
    
    def __init__(self):
        self.mcp_client_service = get_mcp_client_service()
    
    async def create_agent_with_mcp_tools(self, connection_id: str, selected_tools: List[str]) -> Dict[str, Any]:
        """Create an agent configuration with specific MCP tools"""
        try:
            
            capabilities = await self.mcp_client_service.discover_capabilities(connection_id)
            
            
            available_tools = capabilities.get('tools', [])
            selected_tool_configs = [
                tool for tool in available_tools 
                if tool['name'] in selected_tools
            ]
            
            return {
                'connection_id': connection_id,
                'available_tools': selected_tool_configs,
                'capabilities': capabilities,
                'tool_count': len(selected_tool_configs)
            }
            
        except Exception as e:
            logger.error(f"Failed to create MCP agent configuration: {e}")
            raise
    
    async def execute_agent_tool(self, connection_id: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific tool for an MCP agent"""
        return await self.mcp_client_service.execute_tool(connection_id, tool_name, arguments)