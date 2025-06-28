from typing import Dict, List, Optional, Any
import asyncio
import logging
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.sse import sse_client

logger = logging.getLogger(__name__)


class MCPClientService:
    """Service for managing MCP server connections and interactions"""
    
    def __init__(self):
        self.active_connections: Dict[str, ClientSession] = {}
        self.active_context_managers: Dict[str, Any] = {}
        self._connection_lock = asyncio.Lock()
    
    async def connect_to_server(self, connection_id: str, server_url: str, 
                               server_config: Optional[Dict[str, Any]] = None) -> ClientSession:
        """Establish connection to MCP server (supports stdio, HTTP/SSE, and WebSocket)"""
        async with self._connection_lock:
            try:
                # Close existing connection if any
                if connection_id in self.active_connections:
                    await self.disconnect_from_server(connection_id)
                
                session = None
                
                # Determine connection type from URL
                if server_url.startswith('stdio://'):
                    # Stdio connection (local executable)
                    command_parts = server_url.replace('stdio://', '').split()
                    if not command_parts:
                        raise ValueError("Stdio URL must contain command")
                    
                    # First part is the command, rest are arguments
                    command = command_parts[0]
                    args = command_parts[1:] if len(command_parts) > 1 else []
                    
                    server_params = StdioServerParameters(command=command, args=args)
                    context_manager = stdio_client(server_params)
                    
                    try:
                        read_stream, write_stream = await context_manager.__aenter__()
                        session = ClientSession(read_stream, write_stream)
                        
                        # Initialize with timeout to prevent hanging
                        try:
                            await asyncio.wait_for(session.initialize(), timeout=10.0)
                            logger.info(f"Successfully initialized MCP session: {connection_id}")
                        except asyncio.TimeoutError:
                            logger.warning(f"MCP session initialization timed out for: {connection_id}")
                            raise ValueError(f"MCP server initialization timed out: {server_url}")
                        except Exception as init_error:
                            logger.error(f"MCP session initialization failed for {connection_id}: {init_error}", exc_info=True)
                            raise ValueError(f"MCP server initialization failed: {str(init_error)}")
                        
                        # Store context manager for cleanup
                        self.active_context_managers[connection_id] = context_manager
                        logger.info(f"Connected to stdio MCP server: {connection_id}")
                        
                    except Exception as e:
                        # Ensure context manager is cleaned up on any error
                        try:
                            await asyncio.wait_for(
                                context_manager.__aexit__(None, None, None), 
                                timeout=3.0
                            )
                        except Exception as cleanup_error:
                            logger.error(f"Error during context manager cleanup: {cleanup_error}")
                        raise e
                
                elif server_url.startswith(('http://', 'https://')):
                    # HTTP/SSE connection (remote server)
                    headers = server_config.get('headers', {}) if server_config else {}
                    timeout = server_config.get('timeout', 5) if server_config else 5
                    session = await sse_client(server_url, headers=headers, timeout=timeout).__aenter__()
                    logger.info(f"Connected to HTTP/SSE MCP server: {connection_id}")
                
                elif server_url.startswith(('ws://', 'wss://')):
                    # WebSocket connection (remote server)
                    # For now, try to convert to HTTP/SSE (many MCP servers support both)
                    http_url = server_url.replace('ws://', 'http://').replace('wss://', 'https://')
                    headers = server_config.get('headers', {}) if server_config else {}
                    timeout = server_config.get('timeout', 5) if server_config else 5
                    session = await sse_client(http_url, headers=headers, timeout=timeout).__aenter__()
                    logger.info(f"Connected to WebSocket MCP server (via HTTP/SSE): {connection_id}")
                
                elif server_config and 'command' in server_config:
                    # Fallback to stdio with command from config
                    command_input = server_config['command']
                    if isinstance(command_input, str):
                        command_parts = command_input.split()
                    else:
                        command_parts = command_input  # Assume it's already a list
                    
                    if not command_parts:
                        raise ValueError("Command cannot be empty")
                    
                    # First part is the command, rest are arguments
                    command = command_parts[0]
                    args = command_parts[1:] if len(command_parts) > 1 else []
                    
                    server_params = StdioServerParameters(command=command, args=args)
                    context_manager = stdio_client(server_params)
                    
                    try:
                        read_stream, write_stream = await context_manager.__aenter__()
                        session = ClientSession(read_stream, write_stream)
                        
                        # Initialize with timeout to prevent hanging
                        try:
                            await asyncio.wait_for(session.initialize(), timeout=10.0)
                            logger.info(f"Successfully initialized MCP session from config: {connection_id}")
                        except asyncio.TimeoutError:
                            logger.warning(f"MCP session initialization timed out for config: {connection_id}")
                            raise ValueError(f"MCP server initialization timed out: {command_input}")
                        except Exception as init_error:
                            logger.error(f"MCP session initialization failed for config {connection_id}: {init_error}", exc_info=True)
                            raise ValueError(f"MCP server initialization failed: {str(init_error)}")
                        
                        # Store context manager for cleanup
                        self.active_context_managers[connection_id] = context_manager
                        logger.info(f"Connected to stdio MCP server from config: {connection_id}")
                        
                    except Exception as e:
                        # Ensure context manager is cleaned up on any error
                        try:
                            await asyncio.wait_for(
                                context_manager.__aexit__(None, None, None), 
                                timeout=3.0
                            )
                        except Exception as cleanup_error:
                            logger.error(f"Error during context manager cleanup (config): {cleanup_error}")
                        raise e
                
                else:
                    raise ValueError(f"Unsupported MCP server URL format: {server_url}")
                
                if not session:
                    raise ValueError(f"Failed to create session for MCP server: {server_url}")
                
                self.active_connections[connection_id] = session
                logger.info(f"Successfully connected to MCP server: {connection_id} ({server_url})")
                
                return session
                
            except Exception as e:
                logger.error(f"Failed to connect to MCP server {connection_id}: {e}")
                raise
    
    async def disconnect_from_server(self, connection_id: str) -> None:
        """Disconnect from MCP server"""
        async with self._connection_lock:
            if connection_id in self.active_connections:
                try:
                    session = self.active_connections[connection_id]
                    await session.close()
                    del self.active_connections[connection_id]
                    logger.info(f"Disconnected from MCP server: {connection_id}")
                except Exception as e:
                    logger.error(f"Error disconnecting from MCP server {connection_id}: {e}")
            
            # Clean up context manager if it exists
            if connection_id in self.active_context_managers:
                try:
                    context_manager = self.active_context_managers[connection_id]
                    await context_manager.__aexit__(None, None, None)
                    del self.active_context_managers[connection_id]
                    logger.info(f"Cleaned up context manager for: {connection_id}")
                except Exception as e:
                    logger.error(f"Error cleaning up context manager for {connection_id}: {e}")
    
    def get_connection(self, connection_id: str) -> Optional[ClientSession]:
        """Get existing MCP connection"""
        return self.active_connections.get(connection_id)
    
    async def discover_capabilities(self, connection_id: str) -> Dict[str, Any]:
        """Discover server capabilities (tools, resources, prompts)"""
        session = self.get_connection(connection_id)
        if not session:
            raise ValueError(f"No active connection for {connection_id}")
        
        try:
            capabilities = {
                'tools': [],
                'resources': [],
                'prompts': [],
                'server_info': {}
            }
            
            # Get server info with timeout
            try:
                server_info = await asyncio.wait_for(session.get_server_info(), timeout=5.0)
                capabilities['server_info'] = {
                    'name': server_info.name,
                    'version': server_info.version,
                    'protocol_version': server_info.protocol_version
                }
            except asyncio.TimeoutError:
                logger.warning(f"Timeout getting server info for {connection_id}")
                capabilities['server_info'] = {'name': 'Unknown', 'version': 'Unknown', 'protocol_version': 'Unknown'}
            
            # List available tools with timeout
            try:
                tools_response = await asyncio.wait_for(session.list_tools(), timeout=5.0)
                capabilities['tools'] = [
                    {
                        'name': tool.name,
                        'description': tool.description,
                        'input_schema': tool.input_schema
                    }
                    for tool in tools_response.tools
                ]
            except asyncio.TimeoutError:
                logger.warning(f"Timeout listing tools for {connection_id}")
            except Exception as e:
                logger.warning(f"Failed to list tools for {connection_id}: {e}")
            
            # List available resources with timeout
            try:
                resources_response = await asyncio.wait_for(session.list_resources(), timeout=5.0)
                capabilities['resources'] = [
                    {
                        'uri': resource.uri,
                        'name': resource.name,
                        'description': resource.description,
                        'mime_type': resource.mime_type
                    }
                    for resource in resources_response.resources
                ]
            except asyncio.TimeoutError:
                logger.warning(f"Timeout listing resources for {connection_id}")
            except Exception as e:
                logger.warning(f"Failed to list resources for {connection_id}: {e}")
            
            # List available prompts with timeout
            try:
                prompts_response = await asyncio.wait_for(session.list_prompts(), timeout=5.0)
                capabilities['prompts'] = [
                    {
                        'name': prompt.name,
                        'description': prompt.description,
                        'arguments': prompt.arguments
                    }
                    for prompt in prompts_response.prompts
                ]
            except asyncio.TimeoutError:
                logger.warning(f"Timeout listing prompts for {connection_id}")
            except Exception as e:
                logger.warning(f"Failed to list prompts for {connection_id}: {e}")
            
            return capabilities
            
        except Exception as e:
            logger.error(f"Failed to discover capabilities for {connection_id}: {e}")
            raise
    
    async def execute_tool(self, connection_id: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool on MCP server"""
        session = self.get_connection(connection_id)
        if not session:
            raise ValueError(f"No active connection for {connection_id}")
        
        try:
            result = await session.call_tool(tool_name, arguments)
            
            # Process the result based on content type
            processed_result = []
            for content in result.content:
                if hasattr(content, 'type') and content.type == 'text':
                    processed_result.append({
                        'type': 'text',
                        'text': content.text
                    })
                elif hasattr(content, 'type') and content.type == 'image':
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
            
            return {
                'success': True,
                'result': processed_result,
                'is_error': result.is_error if hasattr(result, 'is_error') else False
            }
            
        except Exception as e:
            logger.error(f"Failed to execute tool {tool_name} on {connection_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_resource(self, connection_id: str, resource_uri: str) -> Any:
        """Retrieve resource from MCP server"""
        session = self.get_connection(connection_id)
        if not session:
            raise ValueError(f"No active connection for {connection_id}")
        
        try:
            result = await session.read_resource(resource_uri)
            
            # Process the resource content
            processed_content = []
            for content in result.contents:
                if hasattr(content, 'type') and content.type == 'text':
                    processed_content.append({
                        'type': 'text',
                        'text': content.text
                    })
                elif hasattr(content, 'type') and content.type == 'image':
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
            
            return {
                'success': True,
                'contents': processed_content
            }
            
        except Exception as e:
            logger.error(f"Failed to get resource {resource_uri} from {connection_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_prompt(self, connection_id: str, prompt_name: str, arguments: Optional[Dict[str, Any]] = None) -> Any:
        """Get prompt from MCP server"""
        session = self.get_connection(connection_id)
        if not session:
            raise ValueError(f"No active connection for {connection_id}")
        
        try:
            result = await session.get_prompt(prompt_name, arguments or {})
            
            # Process prompt messages
            processed_messages = []
            for message in result.messages:
                content_items = []
                for content in message.content:
                    if hasattr(content, 'type') and content.type == 'text':
                        content_items.append({
                            'type': 'text',
                            'text': content.text
                        })
                    elif hasattr(content, 'type') and content.type == 'image':
                        content_items.append({
                            'type': 'image',
                            'data': getattr(content, 'data', ''),
                            'mime_type': getattr(content, 'mime_type', 'image/png')
                        })
                
                processed_messages.append({
                    'role': message.role,
                    'content': content_items
                })
            
            return {
                'success': True,
                'description': result.description,
                'messages': processed_messages
            }
            
        except Exception as e:
            logger.error(f"Failed to get prompt {prompt_name} from {connection_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def test_connection(self, server_url: str, server_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Test connection to MCP server without storing it"""
        test_connection_id = f"test_{id(server_url)}"
        
        try:
            logger.info(f"Testing MCP connection to: {server_url}")
            
            # Connect with timeout protection
            session = await asyncio.wait_for(
                self.connect_to_server(test_connection_id, server_url, server_config),
                timeout=15.0
            )
            logger.info(f"Successfully connected, discovering capabilities...")
            
            # Discover capabilities with timeout protection
            capabilities = await asyncio.wait_for(
                self.discover_capabilities(test_connection_id),
                timeout=10.0
            )
            logger.info(f"Capabilities discovered: {len(capabilities.get('tools', []))} tools found")
            
            # Clean up test connection
            logger.info(f"Cleaning up test connection...")
            await asyncio.wait_for(
                self.disconnect_from_server(test_connection_id),
                timeout=5.0
            )
            
            return {
                'success': True,
                'capabilities': capabilities
            }
            
        except asyncio.TimeoutError as e:
            logger.error(f"MCP test connection timed out: {server_url}")
            # Force cleanup of test connection on timeout
            try:
                await self._force_cleanup_connection(test_connection_id)
            except Exception as cleanup_error:
                logger.error(f"Failed to force cleanup test connection: {cleanup_error}")
            
            return {
                'success': False,
                'error': 'Connection test timed out. The MCP server may be taking too long to respond.'
            }
            
        except Exception as e:
            logger.error(f"MCP test connection failed: {str(e)}", exc_info=True)
            # Clean up failed test connection
            try:
                await self._force_cleanup_connection(test_connection_id)
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup test connection: {cleanup_error}")
            
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _force_cleanup_connection(self, connection_id: str) -> None:
        """Force cleanup of a connection, including aggressive task cancellation"""
        logger.info(f"Force cleaning up connection: {connection_id}")
        
        # Close session aggressively
        if connection_id in self.active_connections:
            try:
                session = self.active_connections[connection_id]
                # Try to close gracefully first
                await asyncio.wait_for(session.close(), timeout=2.0)
            except Exception as e:
                logger.warning(f"Graceful session close failed for {connection_id}: {e}")
            finally:
                # Remove from active connections regardless
                self.active_connections.pop(connection_id, None)
        
        # Force cleanup context manager
        if connection_id in self.active_context_managers:
            try:
                context_manager = self.active_context_managers[connection_id]
                # Try to exit context manager gracefully
                await asyncio.wait_for(
                    context_manager.__aexit__(None, None, None), 
                    timeout=2.0
                )
            except Exception as e:
                logger.warning(f"Context manager cleanup failed for {connection_id}: {e}")
            finally:
                # Remove from active context managers regardless
                self.active_context_managers.pop(connection_id, None)
        
        logger.info(f"Force cleanup completed for: {connection_id}")

    async def cleanup_all_connections(self):
        """Cleanup all active connections"""
        connection_ids = list(self.active_connections.keys())
        for connection_id in connection_ids:
            try:
                await self.disconnect_from_server(connection_id)
            except Exception as e:
                logger.error(f"Failed to cleanup connection {connection_id}: {e}")
                # Force cleanup as fallback
                await self._force_cleanup_connection(connection_id)


# Singleton instance
_mcp_client_service = None


def get_mcp_client_service() -> MCPClientService:
    """Get the singleton MCP client service"""
    global _mcp_client_service
    if _mcp_client_service is None:
        _mcp_client_service = MCPClientService()
    return _mcp_client_service