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
                    user_id=connection.user_id
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
                
                
            elif message.type == "terminal:close":
                terminal_id = message.data.get("terminal_id")
                print(f"[SOCKETIO] Received terminal close request for: {terminal_id}")
                
                if not terminal_id:
                    print(f"[SOCKETIO] Terminal close request missing terminal_id")
                    error_response = SocketIOMessage(
                        type=MessageType.ERROR,
                        channel=message.channel,
                        data={"message": "terminal_id is required"},
                        timestamp=datetime.now()
                    )
                    await sio_manager.send_to_connection(connection.sid, error_response)
                    return
                
                print(f"[SOCKETIO] Calling terminal_manager.close_session({terminal_id})")
                result = await terminal_manager.close_session(terminal_id)
                print(f"[SOCKETIO] Terminal close result: {result}")
                
                response = SocketIOMessage(
                    type=MessageType.SUCCESS,
                    channel=message.channel,
                    data={"message": "Terminal closed", "terminal_id": terminal_id},
                    timestamp=datetime.now()
                )
                await sio_manager.send_to_connection(connection.sid, response)
                
            elif message.type == "terminal:list":
                project_id = message.data.get("project_id")
                print(f"[SOCKETIO] Terminal list requested for project: {project_id}")
                print(f"[SOCKETIO] All terminal sessions: {list(terminal_manager.sessions.keys())}")
                
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
                
                print(f"[SOCKETIO] Returning {len(terminals)} terminals for user {connection.user_id}")
                for terminal in terminals:
                    print(f"[SOCKETIO] - Terminal: {terminal['terminal_id']}, Status: {terminal['status']}")
                
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

subscription_handler = SocketIOSubscriptionHandler()
terminal_handler = SocketIOTerminalHandler()

socketio_message_handlers: Dict[str, SocketIOMessageHandler] = {
    "subscribe": subscription_handler,
    "unsubscribe": subscription_handler,
    
    "terminal:create": terminal_handler,
    "terminal:input": terminal_handler,
    "terminal:close": terminal_handler,
    "terminal:list": terminal_handler,
}