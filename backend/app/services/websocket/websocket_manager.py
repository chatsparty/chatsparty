from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json
import asyncio
from uuid import uuid4

class MessageType(str, Enum):
    FILE_CREATED = "fs:created"
    FILE_MODIFIED = "fs:modified" 
    FILE_DELETED = "fs:deleted"
    FOLDER_CREATED = "fs:folder_created"
    
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    
    # Terminal Types
    TERMINAL_CREATE = "terminal:create"
    TERMINAL_INPUT = "terminal:input"
    TERMINAL_OUTPUT = "terminal:output"
    TERMINAL_RESIZE = "terminal:resize"
    TERMINAL_CLOSE = "terminal:close"
    TERMINAL_STATUS = "terminal:status"
    TERMINAL_LIST = "terminal:list"
    
    ERROR = "error"
    SUCCESS = "success"

@dataclass
class WebSocketMessage:
    type: MessageType
    channel: str
    data: Dict[str, Any]
    timestamp: datetime
    message_id: str = None
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = str(uuid4())

class WebSocketConnection:
    def __init__(self, websocket: WebSocket, user_id: str, connection_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.connection_id = connection_id
        self.subscriptions: Set[str] = set()
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.channels: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str) -> str:
        connection_id = str(uuid4())
        connection = WebSocketConnection(websocket, user_id, connection_id)
        self.connections[connection_id] = connection
        return connection_id
        
    async def disconnect(self, connection_id: str):
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            for channel in connection.subscriptions.copy():
                await self.unsubscribe(connection_id, channel)
            del self.connections[connection_id]
            
    async def subscribe(self, connection_id: str, channel: str):
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.subscriptions.add(channel)
            
            if channel not in self.channels:
                self.channels[channel] = set()
            self.channels[channel].add(connection_id)
            
    async def unsubscribe(self, connection_id: str, channel: str):
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.subscriptions.discard(channel)
            
            if channel in self.channels:
                self.channels[channel].discard(connection_id)
                if not self.channels[channel]:
                    del self.channels[channel]
                    
    async def broadcast_to_channel(self, channel: str, message: WebSocketMessage):
        if channel in self.channels:
            disconnected = []
            for connection_id in self.channels[channel].copy():
                if connection_id in self.connections:
                    try:
                        await self.connections[connection_id].websocket.send_text(
                            json.dumps({
                                "type": message.type,
                                "channel": message.channel,
                                "data": message.data,
                                "timestamp": message.timestamp.isoformat(),
                                "message_id": message.message_id
                            })
                        )
                        self.connections[connection_id].last_activity = datetime.now()
                    except Exception:
                        disconnected.append(connection_id)
                        
            for connection_id in disconnected:
                await self.disconnect(connection_id)
                
    async def send_to_connection(self, connection_id: str, message: WebSocketMessage):
        if connection_id in self.connections:
            try:
                await self.connections[connection_id].websocket.send_text(
                    json.dumps({
                        "type": message.type,
                        "channel": message.channel,
                        "data": message.data,
                        "timestamp": message.timestamp.isoformat(),
                        "message_id": message.message_id
                    })
                )
                self.connections[connection_id].last_activity = datetime.now()
            except Exception:
                await self.disconnect(connection_id)

websocket_manager = WebSocketManager()