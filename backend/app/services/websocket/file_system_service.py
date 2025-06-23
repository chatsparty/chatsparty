from ..vm_factory import get_vm_service
from .websocket_manager import websocket_manager, WebSocketMessage, MessageType
from datetime import datetime
from typing import Dict
import os

class FileSystemWebSocketService:
    def __init__(self):
        self.active_watchers: Dict[str, bool] = {}
        
    async def start_project_file_watcher(self, project_id: str):
        import logging
        logger = logging.getLogger(__name__)
        
        print(f"[FILE_SYSTEM_DEBUG] Method called for project {project_id}")
        logger.info(f"[FILE_SYSTEM_WS] Starting file watcher for project {project_id}")
        logger.info(f"[FILE_SYSTEM_WS] Current active watchers: {list(self.active_watchers.keys())}")
        
        if project_id in self.active_watchers:
            print(f"[FILE_SYSTEM_DEBUG] Watcher already active, returning early")
            logger.info(f"[FILE_SYSTEM_WS] File watcher already active for {project_id}")
            return
        
        print(f"[FILE_SYSTEM_DEBUG] Getting VM service...")
        vm_service = get_vm_service()
        print(f"[FILE_SYSTEM_DEBUG] Got VM service: {vm_service}")
        logger.info(f"[FILE_SYSTEM_WS] Setting up VM file watcher with callback: {self._file_change_callback}")
        
        print(f"[FILE_SYSTEM_DEBUG] About to call vm_service.setup_file_watcher...")
        try:
            await vm_service.setup_file_watcher(project_id, self._file_change_callback)
            print(f"[FILE_SYSTEM_DEBUG] vm_service.setup_file_watcher completed successfully")
        except Exception as e:
            print(f"[FILE_SYSTEM_DEBUG] ERROR in vm_service.setup_file_watcher: {e}")
            import traceback
            print(f"[FILE_SYSTEM_DEBUG] Traceback: {traceback.format_exc()}")
            raise
        
        self.active_watchers[project_id] = True
        print(f"[FILE_SYSTEM_DEBUG] Set active_watchers[{project_id}] = True")
        
        logger.info(f"[FILE_SYSTEM_WS] ✅ File watcher started for {project_id}")
        logger.info(f"[FILE_SYSTEM_WS] Active watchers now: {list(self.active_watchers.keys())}")
        print(f"[FILE_SYSTEM_DEBUG] Method completed successfully")
        
    async def stop_project_file_watcher(self, project_id: str):
        if project_id not in self.active_watchers:
            return
            
        vm_service = get_vm_service()
        await vm_service.stop_file_watcher(project_id)
        del self.active_watchers[project_id]
        
    async def _file_change_callback(self, event_type: str, file_path: str, project_id: str):
        import logging
        logger = logging.getLogger(__name__)
        
        print(f"[WEBSOCKET_CALLBACK_DEBUG] 🎯 CALLBACK STARTED: {event_type} - {file_path} - {project_id}")
        logger.info(f"[FILE_SYSTEM_WS] 🎯 Callback triggered: {event_type} - {file_path} - {project_id}")
        
        workspace_prefixes = [
            f"/private/tmp/chatsparty/projects/{project_id}/",
            f"/tmp/chatsparty/projects/{project_id}/"
        ]
        
        relative_path = file_path
        for prefix in workspace_prefixes:
            if file_path.startswith(prefix):
                relative_path = file_path.replace(prefix, "")
                logger.info(f"[FILE_SYSTEM_WS] ✅ Path converted: {file_path} -> {relative_path}")
                break
        
        if relative_path == file_path:
            logger.warning(f"[FILE_SYSTEM_WS] ⚠️ Path conversion failed: {file_path}")
            logger.warning(f"[FILE_SYSTEM_WS] Expected prefixes: {workspace_prefixes}")
        
        message = WebSocketMessage(
            type=f"fs:{event_type}",
            channel=f"project:{project_id}:files",
            data={
                "file_path": relative_path,
                "full_path": file_path,
                "project_id": project_id,
                "event_type": event_type,
                "timestamp": datetime.now().isoformat()
            },
            timestamp=datetime.now()
        )
        
        logger.info(f"[FILE_SYSTEM_WS] 📤 Sending WebSocket message: {message}")
        logger.info(f"[FILE_SYSTEM_WS] Channel: project:{project_id}:files")
        
        try:
            await websocket_manager.broadcast_to_channel(f"project:{project_id}:files", message)
            logger.info(f"[FILE_SYSTEM_WS] ✅ WebSocket message sent successfully")
        except Exception as e:
            logger.error(f"[FILE_SYSTEM_WS] ❌ Failed to send WebSocket message: {e}")
            import traceback
            logger.error(f"[FILE_SYSTEM_WS] Traceback: {traceback.format_exc()}")

file_system_service = FileSystemWebSocketService()