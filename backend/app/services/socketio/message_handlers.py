from abc import ABC, abstractmethod
from typing import Dict, Any
from datetime import datetime
from .socketio_manager import SocketIOMessage, SocketIOConnection, MessageType

class SocketIOMessageHandler(ABC):
    @abstractmethod
    async def handle(self, message: SocketIOMessage, connection: SocketIOConnection, sio_manager) -> None:
        pass

class SocketIOSubscriptionHandler(SocketIOMessageHandler):
    async def handle(self, message: SocketIOMessage, connection: SocketIOConnection, sio_manager) -> None:
        if message.type == "subscribe":
            channel = message.data.get("channel")
            if channel:
                await sio_manager.subscribe_to_channel(connection.sid, channel)
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS,
                    channel=channel,
                    data={"message": f"Subscribed to {channel}"},
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)
                
        elif message.type == "unsubscribe":
            channel = message.data.get("channel")
            if channel:
                await sio_manager.unsubscribe_from_channel(connection.sid, channel)
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS, 
                    channel=channel,
                    data={"message": f"Unsubscribed from {channel}"},
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)

class SocketIOTerminalHandler(SocketIOMessageHandler):
    async def handle(self, message: SocketIOMessage, connection: SocketIOConnection, sio_manager) -> None:
        from ..terminal.terminal_manager import terminal_manager
        
        try:
            if message.type == "terminal:create":
                project_id = message.data.get("project_id")
                rows = message.data.get("rows", 24)
                cols = message.data.get("cols", 80)
                
                if not project_id:
                    error_response = SocketIOMessage(
                        type=MessageType.ERROR,
                        channel=message.channel,
                        data={"message": "project_id is required"},
                        timestamp=datetime.now()
                    )
                    await sio_manager.send_to_connection(connection.sid, error_response)
                    return
                
                session = await terminal_manager.create_session(
                    project_id=project_id,
                    user_id=connection.user_id,
                    rows=rows,
                    cols=cols
                )
                terminal_id = session.session_id
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS,
                    channel=message.channel,
                    data={
                        "message": "Terminal created",
                        "terminal_id": terminal_id,
                        "project_id": project_id
                    },
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)
                
            elif message.type == "terminal:input":
                terminal_id = message.data.get("terminal_id")
                input_data = message.data.get("input", "")
                
                if not terminal_id:
                    error_response = SocketIOMessage(
                        type=MessageType.ERROR,
                        channel=message.channel,
                        data={"message": "terminal_id is required"},
                        timestamp=datetime.now()
                    )
                    await sio_manager.send_to_connection(connection.sid, error_response)
                    return
                
                await terminal_manager.send_input(terminal_id, input_data)
                
            elif message.type == "terminal:resize":
                terminal_id = message.data.get("terminal_id")
                cols = message.data.get("cols", 80)
                rows = message.data.get("rows", 24)
                
                if not terminal_id:
                    error_response = SocketIOMessage(
                        type=MessageType.ERROR,
                        channel=message.channel,
                        data={"message": "terminal_id is required"},
                        timestamp=datetime.now()
                    )
                    await sio_manager.send_to_connection(connection.sid, error_response)
                    return
                
                await terminal_manager.resize_session(terminal_id, rows, cols)
                
            elif message.type == "terminal:close":
                terminal_id = message.data.get("terminal_id")
                
                if not terminal_id:
                    error_response = SocketIOMessage(
                        type=MessageType.ERROR,
                        channel=message.channel,
                        data={"message": "terminal_id is required"},
                        timestamp=datetime.now()
                    )
                    await sio_manager.send_to_connection(connection.sid, error_response)
                    return
                
                await terminal_manager.close_session(terminal_id)
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS,
                    channel=message.channel,
                    data={"message": "Terminal closed", "terminal_id": terminal_id},
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)
                
            elif message.type == "terminal:list":
                project_id = message.data.get("project_id")
                # Get active sessions for this project and user
                terminals = [
                    {
                        "terminal_id": session.session_id,
                        "project_id": session.project_id,
                        "status": session.status.value,
                        "created_at": session.created_at.isoformat()
                    }
                    for session in terminal_manager.sessions.values()
                    if session.user_id == connection.user_id and 
                       (not project_id or session.project_id == project_id)
                ]
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS,
                    channel=message.channel,
                    data={"terminals": terminals},
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)
                
        except Exception as e:
            print(f"[SOCKETIO] Error in terminal handler: {e}")
            error_response = SocketIOMessage(
                type=MessageType.ERROR,
                channel=message.channel,
                data={"message": f"Terminal error: {str(e)}"},
                timestamp=datetime.now()
            )
            await sio_manager.send_to_connection(connection.sid, error_response)

# Create handler instances
subscription_handler = SocketIOSubscriptionHandler()
terminal_handler = SocketIOTerminalHandler()

# Message handler registry
socketio_message_handlers: Dict[str, SocketIOMessageHandler] = {
    "subscribe": subscription_handler,
    "unsubscribe": subscription_handler,
    
    "terminal:create": terminal_handler,
    "terminal:input": terminal_handler,
    "terminal:resize": terminal_handler,
    "terminal:close": terminal_handler,
    "terminal:list": terminal_handler,
}