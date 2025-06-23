from .message_handlers import MessageHandler
from .websocket_manager import WebSocketMessage, WebSocketConnection, websocket_manager, MessageType
from ..terminal.terminal_manager import terminal_manager
from datetime import datetime
import json

class TerminalHandler(MessageHandler):
    async def handle(self, message: WebSocketMessage, connection: WebSocketConnection) -> None:
        try:
            if message.type == MessageType.TERMINAL_CREATE:
                await self._handle_create_terminal(message, connection)
            elif message.type == MessageType.TERMINAL_INPUT:
                await self._handle_terminal_input(message, connection)
            elif message.type == MessageType.TERMINAL_RESIZE:
                await self._handle_terminal_resize(message, connection)
            elif message.type == MessageType.TERMINAL_CLOSE:
                await self._handle_close_terminal(message, connection)
            elif message.type == MessageType.TERMINAL_LIST:
                await self._handle_list_terminals(message, connection)
        except Exception as e:
            await self._send_error(connection, f"Terminal error: {str(e)}")
            
    async def _handle_create_terminal(self, message: WebSocketMessage, connection: WebSocketConnection):
        """Create new terminal session"""
        project_id = message.data.get("project_id")
        rows = message.data.get("rows", 24)
        cols = message.data.get("cols", 80)
        
        if not project_id:
            await self._send_error(connection, "Project ID required")
            return
            
        try:
            session = await terminal_manager.create_session(
                project_id=project_id,
                user_id=connection.user_id,
                rows=rows,
                cols=cols
            )
            
            await websocket_manager.subscribe(connection.connection_id, session.websocket_channel)
            
            response = WebSocketMessage(
                type=MessageType.TERMINAL_STATUS,
                channel=session.websocket_channel,
                data={"session": session.to_dict()},
                timestamp=datetime.now()
            )
            await websocket_manager.send_to_connection(connection.connection_id, response)
            
        except Exception as e:
            await self._send_error(connection, f"Failed to create terminal: {str(e)}")
            
    async def _handle_terminal_input(self, message: WebSocketMessage, connection: WebSocketConnection):
        """Handle terminal input"""
        session_id = message.data.get("session_id")
        input_data = message.data.get("input", "")
        
        if not session_id:
            await self._send_error(connection, "Session ID required")
            return
            
        success = await terminal_manager.send_input(session_id, input_data)
        if not success:
            await self._send_error(connection, "Failed to send input to terminal")
            
    async def _handle_terminal_resize(self, message: WebSocketMessage, connection: WebSocketConnection):
        """Handle terminal resize"""
        session_id = message.data.get("session_id")
        rows = message.data.get("rows", 24)
        cols = message.data.get("cols", 80)
        
        if not session_id:
            await self._send_error(connection, "Session ID required")
            return
            
        success = await terminal_manager.resize_session(session_id, rows, cols)
        if not success:
            await self._send_error(connection, "Failed to resize terminal")
            
    async def _handle_close_terminal(self, message: WebSocketMessage, connection: WebSocketConnection):
        """Handle terminal close"""
        session_id = message.data.get("session_id")
        
        if not session_id:
            await self._send_error(connection, "Session ID required")
            return
            
        success = await terminal_manager.close_session(session_id)
        if success:
            response = WebSocketMessage(
                type=MessageType.SUCCESS,
                channel=message.channel,
                data={"message": "Terminal session closed"},
                timestamp=datetime.now()
            )
            await websocket_manager.send_to_connection(connection.connection_id, response)
        else:
            await self._send_error(connection, "Failed to close terminal session")
            
    async def _handle_list_terminals(self, message: WebSocketMessage, connection: WebSocketConnection):
        """List user's terminal sessions"""
        sessions = terminal_manager.get_user_sessions(connection.user_id)
        
        response = WebSocketMessage(
            type=MessageType.TERMINAL_LIST,
            channel=message.channel,
            data={
                "sessions": [session.to_dict() for session in sessions]
            },
            timestamp=datetime.now()
        )
        await websocket_manager.send_to_connection(connection.connection_id, response)
        
    async def _send_error(self, connection: WebSocketConnection, error_message: str):
        """Send error message to connection"""
        error_msg = WebSocketMessage(
            type=MessageType.ERROR,
            channel="system",
            data={"error": error_message},
            timestamp=datetime.now()
        )
        await websocket_manager.send_to_connection(connection.connection_id, error_msg)