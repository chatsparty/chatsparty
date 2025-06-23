from abc import ABC, abstractmethod
from typing import Dict, Any
from datetime import datetime
from .websocket_manager import WebSocketMessage, WebSocketConnection

class MessageHandler(ABC):
    @abstractmethod
    async def handle(self, message: WebSocketMessage, connection: WebSocketConnection) -> None:
        pass

class FileSystemHandler(MessageHandler):
    async def handle(self, message: WebSocketMessage, connection: WebSocketConnection) -> None:
        pass

class SubscriptionHandler(MessageHandler):
    async def handle(self, message: WebSocketMessage, connection: WebSocketConnection) -> None:
        from .websocket_manager import websocket_manager
        
        if message.type == "subscribe":
            channel = message.data.get("channel")
            if channel:
                await websocket_manager.subscribe(connection.connection_id, channel)
                
                response = WebSocketMessage(
                    type="success",
                    channel=channel,
                    data={"message": f"Subscribed to {channel}"},
                    timestamp=datetime.now()
                )
                await websocket_manager.send_to_connection(connection.connection_id, response)
                
        elif message.type == "unsubscribe":
            channel = message.data.get("channel")
            if channel:
                await websocket_manager.unsubscribe(connection.connection_id, channel)
                
                response = WebSocketMessage(
                    type="success", 
                    channel=channel,
                    data={"message": f"Unsubscribed from {channel}"},
                    timestamp=datetime.now()
                )
                await websocket_manager.send_to_connection(connection.connection_id, response)

from .terminal_handler import TerminalHandler

terminal_handler = TerminalHandler()

message_handlers: Dict[str, MessageHandler] = {
    "subscribe": SubscriptionHandler(),
    "unsubscribe": SubscriptionHandler(),
    "fs:created": FileSystemHandler(),
    "fs:modified": FileSystemHandler(),
    "fs:deleted": FileSystemHandler(),
    "fs:folder_created": FileSystemHandler(),
    
    "terminal:create": terminal_handler,
    "terminal:input": terminal_handler,
    "terminal:resize": terminal_handler,
    "terminal:close": terminal_handler,
    "terminal:list": terminal_handler,
}