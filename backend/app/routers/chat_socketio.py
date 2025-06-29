from typing import Dict, Any, Optional
import logging
from ..services.ai import get_ai_service
from ..services.websocket_service import websocket_service
from ..models.database import User
from .auth import get_current_user_from_token
from app.core.config import settings

if settings.enable_credits:
    from ..middleware.credit_middleware import get_credit_service
    from ..models.credit import CreditConsumptionReason, CreditConsumptionRequest
    from ..services.credit.application.credit_service import InsufficientCreditsError
import asyncio

logger = logging.getLogger(__name__)

sio = websocket_service.get_sio_server()

@sio.event
async def start_multi_agent_conversation(sid, data):
    """Handle starting a multi-agent conversation via Socket.IO"""
    try:
        conversation_id = data.get('conversation_id')
        agent_ids = data.get('agent_ids', [])
        initial_message = data.get('initial_message', '')
        max_turns = data.get('max_turns', 10)
        file_attachments = data.get('file_attachments')
        project_id = data.get('project_id')
        
        token = data.get('token')
        user = None
        user_id = None
        
        if token:
            try:
                user = await get_current_user_from_token(token)
                if user:
                    user_id = user.id
            except Exception as e:
                await sio.emit('conversation_error', {
                    'conversation_id': conversation_id,
                    'error': 'Authentication failed'
                }, room=sid)
                return
        
        websocket_service.active_conversations[conversation_id] = {
            'sid': sid,
            'agent_ids': agent_ids,
            'user_id': user_id,
            'is_active': True
        }
        
        sio.enter_room(sid, conversation_id)
        
        await sio.emit('conversation_started', {
            'conversation_id': conversation_id,
            'agent_ids': agent_ids,
            'status': 'started'
        }, room=conversation_id)
        
        ai_service = get_ai_service()
        
        
        try:
            async for message in ai_service.multi_agent_conversation_stream(
                conversation_id,
                agent_ids,
                initial_message,
                max_turns,
                user_id,
                file_attachments,
                project_id
            ):
                if conversation_id not in websocket_service.active_conversations:
                    break
                
                if not websocket_service.active_conversations[conversation_id].get('is_active', False):
                    break
                
                if message.get('type') == 'typing':
                    await websocket_service.emit_typing_indicator(
                        conversation_id,
                        message.get('agent_id', ''),
                        message.get('speaker', '')
                    )
                elif message.get('type') == 'message':
                    await websocket_service.emit_agent_message(
                        conversation_id,
                        message.get('agent_id', ''),
                        message.get('speaker', ''),
                        message.get('message', ''),
                        message.get('timestamp', asyncio.get_event_loop().time())
                    )
                elif message.get('error'):
                    await websocket_service.emit_error(
                        conversation_id,
                        message.get('error', 'Unknown error')
                    )
                    break
                
                await asyncio.sleep(0.1)
            
            await websocket_service.emit_conversation_complete(conversation_id)
            
        except Exception as e:
            logger.error(f"Error in conversation stream: {str(e)}")
            await websocket_service.emit_error(
                conversation_id,
                f"Conversation error: {str(e)}"
            )
        finally:
            if conversation_id in websocket_service.active_conversations:
                del websocket_service.active_conversations[conversation_id]
    
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        await sio.emit('conversation_error', {
            'conversation_id': data.get('conversation_id', 'unknown'),
            'error': str(e)
        }, room=sid)