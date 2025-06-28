from typing import List, Dict, Any, Optional
import re
import json
import logging
from datetime import datetime
from .chat_service import ChatService
from ..domain.entities import Message, ConversationMessage, Agent
from ...mcp.mcp_client_service import get_mcp_client_service
from ...connection_service import connection_service

logger = logging.getLogger(__name__)


class EnhancedChatService:
    """Enhanced chat service that adds MCP tool execution capabilities to any agent"""
    
    def __init__(self, base_chat_service: ChatService):
        self.base_chat_service = base_chat_service
        self.mcp_client_service = get_mcp_client_service()
    
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Enhanced agent chat with MCP tool execution support"""
        
        # First, get the agent to check if it has MCP tools configured
        agent_repo = self.base_chat_service._agent_repository
        agent = agent_repo.get_agent(agent_id, user_id)
        
        if not agent:
            return f"Agent {agent_id} not found"
        
        # Check if this agent has MCP tools and if it's using an MCP connection
        has_mcp_tools = (
            hasattr(agent, 'selected_mcp_tools') and 
            agent.selected_mcp_tools and 
            len(agent.selected_mcp_tools) > 0
        )
        
        # Get the connection to check if it's MCP
        connection = connection_service.get_connection(agent.connection_id, user_id)
        is_mcp_connection = connection and connection.provider == 'mcp'
        
        if not has_mcp_tools and not is_mcp_connection:
            # No MCP capabilities, use base chat service
            return await self.base_chat_service.agent_chat(agent_id, message, conversation_id, user_id)
        
        # Process with MCP tool support
        return await self._process_chat_with_mcp_tools(
            agent, message, conversation_id, user_id, has_mcp_tools, is_mcp_connection
        )
    
    async def _process_chat_with_mcp_tools(
        self,
        agent: Agent,
        message: str,
        conversation_id: str,
        user_id: str,
        has_mcp_tools: bool,
        is_mcp_connection: bool
    ) -> str:
        """Process chat with MCP tool execution"""
        
        try:
            # Step 1: Get initial response from the agent
            if is_mcp_connection:
                # For MCP connections, handle tool requests directly
                response = await self._handle_mcp_direct_request(agent, message, conversation_id, user_id)
            else:
                # For non-MCP connections, get AI response first
                response = await self.base_chat_service.agent_chat(
                    agent.agent_id, message, conversation_id, user_id
                )
            
            # Step 2: Check if the response contains tool execution commands
            if has_mcp_tools:
                tool_commands = self._extract_tool_commands(response)
                
                if tool_commands:
                    # Execute tools and get results
                    tool_results = await self._execute_mcp_tools(
                        agent.connection_id, tool_commands, user_id
                    )
                    
                    # If we got tool results, ask the agent to incorporate them
                    if tool_results and not is_mcp_connection:
                        context_message = f"Tool execution results:\n{tool_results}\n\nPlease incorporate these results into your response to the user."
                        final_response = await self.base_chat_service.agent_chat(
                            agent.agent_id, context_message, conversation_id, user_id
                        )
                        return final_response
                    elif tool_results and is_mcp_connection:
                        # For MCP connections, format the tool results directly
                        return f"{response}\n\nTool Results:\n{tool_results}"
            
            return response
            
        except Exception as e:
            logger.error(f"Error in enhanced chat with MCP tools: {e}")
            # Fallback to base chat service
            return await self.base_chat_service.agent_chat(
                agent.agent_id, message, conversation_id, user_id
            )
    
    async def _handle_mcp_direct_request(self, agent: Agent, message: str, conversation_id: str, user_id: str) -> str:
        """Handle direct MCP tool requests"""
        
        # Check if message is a direct tool command
        tool_request = self._parse_tool_request(message)
        
        if tool_request:
            # Execute the tool directly
            result = await self.mcp_client_service.execute_tool(
                connection_id=agent.connection_id,
                tool_name=tool_request['tool_name'],
                arguments=tool_request['arguments']
            )
            
            if result['success']:
                return self._format_tool_result(result['result'])
            else:
                return f"Tool execution failed: {result.get('error', 'Unknown error')}"
        else:
            # Not a direct tool command, get available capabilities
            try:
                capabilities = await self.mcp_client_service.discover_capabilities(agent.connection_id)
                return self._format_capabilities_response(capabilities, message)
            except Exception as e:
                return f"Error discovering MCP capabilities: {str(e)}"
    
    def _extract_tool_commands(self, text: str) -> List[Dict[str, Any]]:
        """Extract tool execution commands from agent response"""
        commands = []
        
        # Pattern 1: "use tool <name> with {args}"
        pattern1 = r"use tool (\w+) with ({[^}]+})"
        matches1 = re.findall(pattern1, text, re.IGNORECASE)
        
        for tool_name, args_str in matches1:
            try:
                arguments = json.loads(args_str)
                commands.append({'tool_name': tool_name, 'arguments': arguments})
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool arguments: {args_str}")
        
        # Pattern 2: "execute <name>({args})"
        pattern2 = r"execute (\w+)\(({[^}]+})\)"
        matches2 = re.findall(pattern2, text, re.IGNORECASE)
        
        for tool_name, args_str in matches2:
            try:
                arguments = json.loads(args_str)
                commands.append({'tool_name': tool_name, 'arguments': arguments})
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool arguments: {args_str}")
        
        return commands
    
    def _parse_tool_request(self, user_input: str) -> Optional[Dict[str, Any]]:
        """Parse user input to detect tool execution requests"""
        user_input_lower = user_input.lower().strip()
        
        # Pattern 1: "use tool <name> with <args>"
        if user_input_lower.startswith("use tool "):
            parts = user_input[9:].split(" with ", 1)
            if len(parts) == 2:
                tool_name = parts[0].strip()
                try:
                    arguments = json.loads(parts[1].strip())
                    return {'tool_name': tool_name, 'arguments': arguments}
                except json.JSONDecodeError:
                    # Try to parse as simple key=value pairs
                    args_str = parts[1].strip()
                    arguments = {}
                    for pair in args_str.split(','):
                        if '=' in pair:
                            key, value = pair.split('=', 1)
                            arguments[key.strip()] = value.strip()
                    return {'tool_name': tool_name, 'arguments': arguments}
        
        # Pattern 2: "execute <name>(<args>)"
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
    
    async def _execute_mcp_tools(
        self, 
        connection_id: str, 
        tool_commands: List[Dict[str, Any]], 
        user_id: str
    ) -> str:
        """Execute multiple MCP tools and format results"""
        
        results = []
        
        for command in tool_commands:
            try:
                tool_name = command['tool_name']
                arguments = command['arguments']
                
                # Execute the tool
                result = await self.mcp_client_service.execute_tool(
                    connection_id=connection_id,
                    tool_name=tool_name,
                    arguments=arguments
                )
                
                if result['success']:
                    formatted_result = self._format_tool_result(result['result'])
                    results.append(f"**{tool_name}**: {formatted_result}")
                else:
                    results.append(f"**{tool_name}**: Error - {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                results.append(f"**{command.get('tool_name', 'unknown')}**: Exception - {str(e)}")
        
        return "\n".join(results) if results else "No tool results available."
    
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
        
        # List available tools
        tools = capabilities.get('tools', [])
        if tools:
            response_parts.append(f"\nAvailable tools ({len(tools)}):")
            for tool in tools[:10]:  # Limit to first 10 tools
                response_parts.append(f"  - {tool['name']}: {tool.get('description', 'No description')}")
            
            if len(tools) > 10:
                response_parts.append(f"  ... and {len(tools) - 10} more tools")
            
            response_parts.append(f"\nTo use a tool, try: 'use tool <tool_name> with {{\"arg1\": \"value1\"}}'")
        
        if not tools:
            response_parts.append("No tools are available from this MCP server.")
        
        return "\n".join(response_parts)
    
    # Delegate other methods to base service
    async def multi_agent_conversation(self, *args, **kwargs):
        return await self.base_chat_service.multi_agent_conversation(*args, **kwargs)