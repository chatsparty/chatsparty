import socketio
from typing import Dict, Any, Optional
import logging
from fastapi import HTTPException
import json

logger = logging.getLogger(__name__)

class WebSocketService:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins="*",
            logger=False,
            engineio_logger=False
        )
        self.app = socketio.ASGIApp(self.sio)
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
        self.user_sessions: Dict[str, str] = {}  # session_id -> user_id mapping
        
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        @self.sio.event
        async def connect(sid, environ, auth):
            # Extract token from auth if provided
            if auth and 'token' in auth:
                # Here you would validate the token and get user_id
                # For now, we'll store the session
                self.user_sessions[sid] = auth.get('user_id', sid)
            return True
        
        @self.sio.event
        async def disconnect(sid):
            # Clean up any active conversations for this session
            for conv_id, conv_data in list(self.active_conversations.items()):
                if conv_data.get('sid') == sid:
                    await self.stop_conversation(conv_id)
            # Remove user session
            self.user_sessions.pop(sid, None)
        
        @self.sio.event
        async def join_conversation(sid, data):
            """Join a conversation room"""
            conversation_id = data.get('conversation_id')
            if conversation_id:
                self.sio.enter_room(sid, conversation_id)
                await self.sio.emit('joined_conversation', {
                    'conversation_id': conversation_id,
                    'status': 'joined'
                }, room=sid)
        
        @self.sio.event
        async def leave_conversation(sid, data):
            """Leave a conversation room"""
            conversation_id = data.get('conversation_id')
            if conversation_id:
                self.sio.leave_room(sid, conversation_id)
                await self.sio.emit('left_conversation', {
                    'conversation_id': conversation_id,
                    'status': 'left'
                }, room=sid)
        
        @self.sio.event
        async def start_conversation(sid, data):
            """Start a new multi-agent conversation"""
            try:
                conversation_id = data.get('conversation_id')
                agent_ids = data.get('agent_ids', [])
                initial_message = data.get('initial_message', '')
                max_turns = data.get('max_turns', 10)
                user_id = data.get('user_id') or self.user_sessions.get(sid)
                file_attachments = data.get('file_attachments')
                project_id = data.get('project_id')
                
                # Store conversation data
                self.active_conversations[conversation_id] = {
                    'sid': sid,
                    'agent_ids': agent_ids,
                    'user_id': user_id,
                    'is_active': True
                }
                
                # Join the conversation room
                self.sio.enter_room(sid, conversation_id)
                
                # Emit conversation started event
                await self.sio.emit('conversation_started', {
                    'conversation_id': conversation_id,
                    'agent_ids': agent_ids,
                    'status': 'started'
                }, room=conversation_id)
                
            except Exception as e:
                await self.sio.emit('conversation_error', {
                    'conversation_id': conversation_id,
                    'error': str(e)
                }, room=sid)
        
        @self.sio.event
        async def stop_conversation(sid, data):
            """Stop an active conversation"""
            conversation_id = data.get('conversation_id')
            await self.stop_conversation(conversation_id)
    
    async def stop_conversation(self, conversation_id: str):
        """Stop a conversation and notify all participants"""
        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id]['is_active'] = False
            
            await self.sio.emit('conversation_stopped', {
                'conversation_id': conversation_id,
                'status': 'stopped'
            }, room=conversation_id)
            
            # Clean up
            del self.active_conversations[conversation_id]
    
    async def emit_typing_indicator(self, conversation_id: str, agent_id: str, agent_name: str):
        """Emit typing indicator for an agent"""
        await self.sio.emit('agent_typing', {
            'type': 'typing',
            'conversation_id': conversation_id,
            'agent_id': agent_id,
            'speaker': agent_name,
            'message': '...'
        }, room=conversation_id)
    
    async def emit_agent_message(self, conversation_id: str, agent_id: str, agent_name: str, 
                                message: str, timestamp: float):
        """Emit a message from an agent"""
        await self.sio.emit('agent_message', {
            'type': 'message',
            'conversation_id': conversation_id,
            'agent_id': agent_id,
            'speaker': agent_name,
            'message': message,
            'timestamp': timestamp
        }, room=conversation_id)
    
    async def emit_conversation_complete(self, conversation_id: str):
        """Emit conversation complete event"""
        await self.sio.emit('conversation_complete', {
            'type': 'complete',
            'conversation_id': conversation_id,
            'status': 'completed'
        }, room=conversation_id)
        
        # Clean up conversation
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]
    
    async def emit_error(self, conversation_id: str, error_message: str):
        """Emit error event"""
        await self.sio.emit('conversation_error', {
            'type': 'error',
            'conversation_id': conversation_id,
            'error': error_message
        }, room=conversation_id)
    
    def get_socketio_app(self):
        """Get the Socket.IO ASGI app"""
        return self.app
    
    def get_sio_server(self):
        """Get the Socket.IO server instance"""
        return self.sio

# Create a singleton instance
websocket_service = WebSocketService()