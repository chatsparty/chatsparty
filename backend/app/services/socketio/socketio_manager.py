import socketio
import asyncio
from typing import Dict, Set, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json
from uuid import uuid4

class MessageType(str, Enum):
    FILE_CREATED = "fs:created"
    FILE_MODIFIED = "fs:modified" 
    FILE_DELETED = "fs:deleted"
    FOLDER_CREATED = "fs:folder_created"
    
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    
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
class SocketIOMessage:
    type: MessageType
    channel: str
    data: Dict[str, Any]
    timestamp: datetime
    message_id: str = None
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = str(uuid4())

class SocketIOConnection:
    def __init__(self, sid: str, user_id: str):
        self.sid = sid
        self.user_id = user_id
        self.subscriptions: Set[str] = set()
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

class SocketIOManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins=[],
            logger=True,
            engineio_logger=True
        )
        
        self.connections: Dict[str, SocketIOConnection] = {}
        self.channels: Dict[str, Set[str]] = {}
        
        self.setup_events()
    
    def setup_events(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ, auth):
            """Handle client connection"""
            print(f"[SOCKETIO] Client {sid} attempting to connect")
            
            token = None
            if auth and 'token' in auth:
                token = auth['token']
            elif 'token' in environ.get('QUERY_STRING', ''):
                query_params = environ.get('QUERY_STRING', '')
                for param in query_params.split('&'):
                    if param.startswith('token='):
                        token = param.split('=', 1)[1]
                        break
            
            if not token:
                print(f"[SOCKETIO] No token provided for {sid}")
                return False
            
            try:
                from ...services.auth_service import auth_service
                token_data = auth_service.verify_token(token)
                if not token_data or not token_data.user_id:
                    print(f"[SOCKETIO] Invalid token for {sid}")
                    return False
                user_id = token_data.user_id
                
                self.connections[sid] = SocketIOConnection(sid, user_id)
                print(f"[SOCKETIO] ✅ Connected user {user_id} with session {sid}")
                return True
                
            except Exception as e:
                print(f"[SOCKETIO] Authentication error for {sid}: {e}")
                return False
        
        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            if sid in self.connections:
                user_id = self.connections[sid].user_id
                print(f"[SOCKETIO] User {user_id} disconnected (session {sid})")
                
                for channel in self.connections[sid].subscriptions.copy():
                    await self.unsubscribe_from_channel(sid, channel)
                
                del self.connections[sid]
            else:
                print(f"[SOCKETIO] Unknown session {sid} disconnected")
        
        @self.sio.event
        async def message(sid, data):
            """Handle incoming messages"""
            try:
                if sid not in self.connections:
                    print(f"[SOCKETIO] Message from unknown session {sid}")
                    return
                
                connection = self.connections[sid]
                connection.last_activity = datetime.now()
                
                print(f"[SOCKETIO] 📨 Message from {sid}: {data}")
                
                message = SocketIOMessage(
                    type=data.get("type"),
                    channel=data.get("channel", ""),
                    data=data.get("data", {}),
                    timestamp=datetime.now()
                )
                
                await self.route_message(sid, message)
                
            except Exception as e:
                print(f"[SOCKETIO] Error handling message from {sid}: {e}")
                await self.sio.emit('error', {
                    'message': f'Error processing message: {str(e)}'
                }, room=sid)
        
        @self.sio.event
        async def subscribe(sid, data):
            """Handle channel subscription"""
            try:
                channel = data.get('channel')
                if channel and sid in self.connections:
                    await self.subscribe_to_channel(sid, channel)
                    print(f"[SOCKETIO] 📡 {sid} subscribed to {channel}")
            except Exception as e:
                print(f"[SOCKETIO] Error subscribing {sid}: {e}")
        
        @self.sio.event
        async def unsubscribe(sid, data):
            """Handle channel unsubscription"""
            try:
                channel = data.get('channel')
                if channel and sid in self.connections:
                    await self.unsubscribe_from_channel(sid, channel)
                    print(f"[SOCKETIO] 📡 {sid} unsubscribed from {channel}")
            except Exception as e:
                print(f"[SOCKETIO] Error unsubscribing {sid}: {e}")
    
    async def route_message(self, sid: str, message: SocketIOMessage):
        """Route messages to appropriate handlers"""
        try:
            from .message_handlers import socketio_message_handlers
            
            if message.type in socketio_message_handlers:
                connection = self.connections[sid]
                await socketio_message_handlers[message.type].handle(message, connection, self)
            else:
                await self.sio.emit('error', {
                    'message': f'Unknown message type: {message.type}'
                }, room=sid)
                
        except Exception as e:
            print(f"[SOCKETIO] Error routing message: {e}")
            await self.sio.emit('error', {
                'message': f'Error routing message: {str(e)}'
            }, room=sid)
    
    async def subscribe_to_channel(self, sid: str, channel: str):
        """Subscribe a connection to a channel"""
        if sid in self.connections:
            if channel not in self.channels:
                self.channels[channel] = set()
            
            self.channels[channel].add(sid)
            self.connections[sid].subscriptions.add(channel)
            
            await self.sio.enter_room(sid, channel)
    
    async def unsubscribe_from_channel(self, sid: str, channel: str):
        """Unsubscribe a connection from a channel"""
        if channel in self.channels:
            self.channels[channel].discard(sid)
            if not self.channels[channel]:
                del self.channels[channel]
        
        if sid in self.connections:
            self.connections[sid].subscriptions.discard(channel)
            
        await self.sio.leave_room(sid, channel)
    
    async def broadcast_to_channel(self, channel: str, message: SocketIOMessage):
        """Broadcast a message to all connections in a channel"""
        try:
            message_data = {
                "type": message.type.value,
                "channel": message.channel,
                "data": message.data,
                "timestamp": message.timestamp.isoformat(),
                "message_id": message.message_id
            }
            
            print(f"[SOCKETIO] 📤 Broadcasting to channel {channel}: {message.type}")
            
            await self.sio.emit('message', message_data, room=channel)
            
        except Exception as e:
            print(f"[SOCKETIO] Error broadcasting to channel {channel}: {e}")
    
    async def send_to_connection(self, sid: str, message: SocketIOMessage):
        """Send a message to a specific connection"""
        try:
            if sid in self.connections:
                message_data = {
                    "type": message.type.value,
                    "channel": message.channel,
                    "data": message.data,
                    "timestamp": message.timestamp.isoformat(),
                    "message_id": message.message_id
                }
                
                await self.sio.emit('message', message_data, room=sid)
                self.connections[sid].last_activity = datetime.now()
                
        except Exception as e:
            print(f"[SOCKETIO] Error sending to connection {sid}: {e}")
    
    def get_app(self):
        """Get the Socket.IO ASGI app"""
        return socketio.ASGIApp(self.sio)

socketio_manager = SocketIOManager()