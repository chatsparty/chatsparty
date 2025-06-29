from typing import Dict, Any, Optional
import logging
from ..services.ai import get_ai_service
from ..services.websocket_service import websocket_service
from ..models.database import User
from .auth import get_current_user_from_token
from ..middleware.credit_middleware import get_credit_service
from ..models.credit import CreditConsumptionReason, CreditConsumptionRequest
from ..services.credit.application.credit_service import InsufficientCreditsError
import asyncio

logger = logging.getLogger(__name__)

# Get the Socket.IO server instance
sio = websocket_service.get_sio_server()

@sio.event
async def start_multi_agent_conversation(sid, data):
    """Handle starting a multi-agent conversation via Socket.IO"""
    try:
        # Extract conversation parameters
        conversation_id = data.get('conversation_id')
        agent_ids = data.get('agent_ids', [])
        initial_message = data.get('initial_message', '')
        max_turns = data.get('max_turns', 10)
        file_attachments = data.get('file_attachments')
        project_id = data.get('project_id')
        
        # Get auth token from data or session
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
        
        # Store conversation data in websocket service
        websocket_service.active_conversations[conversation_id] = {
            'sid': sid,
            'agent_ids': agent_ids,
            'user_id': user_id,
            'is_active': True
        }
        
        # Join the conversation room
        sio.enter_room(sid, conversation_id)
        
        # Emit conversation started event
        await sio.emit('conversation_started', {
            'conversation_id': conversation_id,
            'agent_ids': agent_ids,
            'status': 'started'
        }, room=conversation_id)
        
        # Get AI service
        ai_service = get_ai_service()
        
        # Consume credits for multi-agent conversation
        if user_id:
            try:
                credit_service = get_credit_service()
                estimated_cost = await credit_service.calculate_conversation_cost(
                    agent_count=len(agent_ids),
                    max_turns=max_turns
                )
                
                # Consume credits upfront for multi-agent conversation
                consumption_request = CreditConsumptionRequest(
                    amount=estimated_cost,
                    reason=CreditConsumptionReason.MULTI_AGENT_CONVERSATION,
                    description=f"Multi-agent conversation with {len(agent_ids)} agents, {max_turns} max turns",
                    metadata={
                        "agent_count": len(agent_ids),
                        "max_turns": max_turns,
                        "conversation_id": conversation_id
                    }
                )
                await credit_service.consume_credits(user_id, consumption_request)
            except InsufficientCreditsError as e:
                await sio.emit('conversation_error', {
                    'conversation_id': conversation_id,
                    'error': f'Insufficient credits: {str(e)}'
                }, room=sid)
                return
            except Exception as e:
                # Continue with conversation even if credit consumption fails
                logger.error(f"Credit consumption failed: {e}")
        
        # Start the conversation stream
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
                # Check if conversation is still active
                if conversation_id not in websocket_service.active_conversations:
                    break
                
                if not websocket_service.active_conversations[conversation_id].get('is_active', False):
                    break
                
                # Handle different message types
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
                
                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.1)
            
            # Emit conversation complete
            await websocket_service.emit_conversation_complete(conversation_id)
            
        except Exception as e:
            logger.error(f"Error in conversation stream: {str(e)}")
            await websocket_service.emit_error(
                conversation_id,
                f"Conversation error: {str(e)}"
            )
        finally:
            # Clean up conversation
            if conversation_id in websocket_service.active_conversations:
                del websocket_service.active_conversations[conversation_id]
    
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        await sio.emit('conversation_error', {
            'conversation_id': data.get('conversation_id', 'unknown'),
            'error': str(e)
        }, room=sid)