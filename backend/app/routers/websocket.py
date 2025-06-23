from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.security import HTTPBearer
from ..services.websocket.websocket_manager import websocket_manager, WebSocketMessage, MessageType
from ..services.websocket.message_handlers import message_handlers
from ..services.auth_service import auth_service
import json
import logging
from datetime import datetime

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    
    try:
        logger.info(f"[WEBSOCKET] Attempting to verify token")
        token_data = auth_service.verify_token(token)
        if not token_data or not token_data.user_id:
            logger.warning(f"[WEBSOCKET] Invalid token data: {token_data}")
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = token_data.user_id
        logger.info(f"[WEBSOCKET] Successfully authenticated user: {user_id}")
    except Exception as e:
        logger.error(f"[WEBSOCKET] Authentication failed: {str(e)}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    connection_id = await websocket_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message = WebSocketMessage(
                    type=message_data.get("type"),
                    channel=message_data.get("channel", ""),
                    data=message_data.get("data", {}),
                    timestamp=datetime.now()
                )
                
                if message.type in message_handlers:
                    connection = websocket_manager.connections[connection_id]
                    await message_handlers[message.type].handle(message, connection)
                else:
                    error_message = WebSocketMessage(
                        type="error",
                        channel="system",
                        data={"message": f"Unknown message type: {message.type}"},
                        timestamp=datetime.now()
                    )
                    await websocket_manager.send_to_connection(connection_id, error_message)
                    
            except json.JSONDecodeError:
                error_message = WebSocketMessage(
                    type="error",
                    channel="system", 
                    data={"message": "Invalid JSON format"},
                    timestamp=datetime.now()
                )
                await websocket_manager.send_to_connection(connection_id, error_message)
                
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)
    except Exception as e:
        await websocket_manager.disconnect(connection_id)
        raise e