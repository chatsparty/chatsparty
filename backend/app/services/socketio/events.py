"""
WebSocket event handlers for Socket.IO
"""
import logging
from typing import Dict, Any

from .socketio_manager import socketio_manager
from .port_monitor_service import port_monitor_service
from ..auth_service import auth_service
from ..project.application.services import ProjectService
from ...core.database import db_manager

logger = logging.getLogger(__name__)
sio = socketio_manager.sio


async def get_current_user_from_token(token: str):
    """Get user from token for WebSocket authentication"""
    try:
        token_data = auth_service.verify_token(token)
        if not token_data or not token_data.user_id:
            return None
            
        async with db_manager.get_async_session() as db:
            user = await auth_service.get_user_by_id(db, token_data.user_id)
            return user
    except Exception as e:
        logger.error(f"Error getting user from token: {e}")
        return None


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    try:
        if not auth or 'token' not in auth:
            logger.warning(f"Connection without auth token from {sid}")
            return False
            
        token = auth['token']
        
        try:
            user = await get_current_user_from_token(token)
            if not user:
                logger.warning(f"Invalid token for connection {sid}")
                return False
        except Exception as e:
            logger.error(f"Error validating token: {e}")
            return False
            
        await sio.save_session(sid, {'user_id': user.id, 'user_email': user.email})
        logger.info(f"User {user.email} connected with sid {sid}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in connect handler: {e}")
        return False


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    try:
        session = await sio.get_session(sid)
        if session and 'user_id' in session:
            logger.info(f"User {session.get('user_email', 'unknown')} disconnected")
            
    except Exception as e:
        logger.error(f"Error in disconnect handler: {e}")


@sio.event
async def join_project(sid, data):
    """Join a project room for updates"""
    try:
        session = await sio.get_session(sid)
        if not session or 'user_id' not in session:
            await sio.emit('error', {'message': 'Not authenticated'}, to=sid)
            return
            
        project_id = data.get('project_id')
        if not project_id:
            await sio.emit('error', {'message': 'Project ID required'}, to=sid)
            return
            
        user_id = session['user_id']
        
        project_service = ProjectService()
        project = project_service.get_project(project_id, user_id)
        if not project:
            await sio.emit('error', {'message': 'Project not found or access denied'}, to=sid)
            return
            
        room = f"project_{project_id}"
        sio.enter_room(sid, room)
        
        logger.info(f"User {session.get('user_email')} joined project {project_id}")
        
        if project.vm_status == 'active':
            await port_monitor_service.start_monitoring(project_id, user_id)
            await port_monitor_service.perform_initial_port_scan(project_id)
            
        await sio.emit('joined_project', {
            'project_id': project_id,
            'vm_status': project.vm_status
        }, to=sid)
        
    except Exception as e:
        logger.error(f"Error in join_project handler: {e}")
        await sio.emit('error', {'message': 'Failed to join project'}, to=sid)


@sio.event
async def leave_project(sid, data):
    """Leave a project room"""
    try:
        session = await sio.get_session(sid)
        if not session:
            return
            
        project_id = data.get('project_id')
        if not project_id:
            return
            
        room = f"project_{project_id}"
        sio.leave_room(sid, room)
        
        logger.info(f"User {session.get('user_email')} left project {project_id}")
        
        rooms = sio.rooms(sid)
        if room not in rooms:
            await port_monitor_service.stop_monitoring(project_id)
            
    except Exception as e:
        logger.error(f"Error in leave_project handler: {e}")


@sio.event
async def request_port_update(sid, data):
    """Request immediate port update"""
    try:
        session = await sio.get_session(sid)
        if not session or 'user_id' not in session:
            await sio.emit('error', {'message': 'Not authenticated'}, to=sid)
            return
            
        project_id = data.get('project_id')
        if not project_id:
            await sio.emit('error', {'message': 'Project ID required'}, to=sid)
            return
            
        user_id = session['user_id']
        
        project_service = ProjectService()
        project = project_service.get_project(project_id, user_id)
        if not project:
            await sio.emit('error', {'message': 'Project not found'}, to=sid)
            return
            
        if project.vm_status != 'active':
            await sio.emit('port_update', {
                'project_id': project_id,
                'active_ports': {},
                'preview_url': None,
                'vm_status': project.vm_status
            }, to=sid)
            return
            
        from ...services.vm_factory import get_vm_service
        vm_service = get_vm_service()
        active_ports = await vm_service.get_active_ports(project_id)
        
        preview_url, preview_port = port_monitor_service._find_best_preview_port(active_ports)
        
        await sio.emit('port_update', {
            'project_id': project_id,
            'active_ports': active_ports,
            'preview_url': preview_url,
            'preview_port': preview_port,
            'vm_status': 'active'
        }, to=sid)
        
    except Exception as e:
        logger.error(f"Error in request_port_update handler: {e}")
        await sio.emit('error', {'message': 'Failed to get port update'}, to=sid)