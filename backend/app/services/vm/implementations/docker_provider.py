import logging
import asyncio
from typing import Dict, List, Optional, Any, Callable
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from ...docker.docker_facade import DockerFacade
from ...project.domain.entities import ProjectFile, VMCommandResult
from ..interfaces.vm_provider import VMProviderInterface

logger = logging.getLogger(__name__)

_global_watched_paths: Dict[str, Observer] = {}
_global_watch_lock = asyncio.Lock()

class DockerFileWatcher(FileSystemEventHandler):
    def __init__(self, project_id: str, callback, event_loop=None):
        self.project_id = project_id
        self.callback = callback
        self.event_loop = event_loop
        
    def on_created(self, event):
        print(f"[WATCHER_DEBUG] on_created called: {event.src_path} (is_directory: {event.is_directory})")
        if not event.is_directory:
            self._schedule_callback('created', event.src_path)
        else:
            self._schedule_callback('folder_created', event.src_path)
            
    def on_modified(self, event):
        print(f"[WATCHER_DEBUG] on_modified called: {event.src_path} (is_directory: {event.is_directory})")
        if not event.is_directory:
            self._schedule_callback('modified', event.src_path)
            
    def on_deleted(self, event):
        print(f"[WATCHER_DEBUG] on_deleted called: {event.src_path} (is_directory: {event.is_directory})")
        event_type = 'deleted' if not event.is_directory else 'folder_deleted'
        self._schedule_callback(event_type, event.src_path)
    
    def _schedule_callback(self, event_type: str, file_path: str):
        """Schedule callback to run in the main event loop"""
        import inspect
        
        print(f"[WATCHER_DEBUG] _schedule_callback called: {event_type} - {file_path}")
        
        is_async = inspect.iscoroutinefunction(self.callback)
        
        print(f"[WATCHER_DEBUG] Callback is async: {is_async}")
        logger.info(f"[FILE_WATCHER] Scheduling callback: {event_type} - {file_path} (async: {is_async})")
        
        if is_async:
            print(f"[WATCHER_DEBUG] Handling async callback...")
            if self.event_loop and not self.event_loop.is_closed():
                try:
                    print(f"[WATCHER_DEBUG] Using stored event loop: {self.event_loop}")
                    future = asyncio.run_coroutine_threadsafe(
                        self.callback(event_type, file_path, self.project_id), 
                        self.event_loop
                    )
                    print(f"[WATCHER_DEBUG] Scheduled coroutine, future: {future}")
                    logger.info(f"[FILE_WATCHER] ✅ Async callback scheduled successfully")
                    return
                except Exception as e:
                    print(f"[WATCHER_DEBUG] ERROR scheduling callback in stored loop: {e}")
                    logger.error(f"[FILE_WATCHER] Failed to schedule async callback in stored event loop: {e}")
            
            print(f"[WATCHER_DEBUG] Trying fallback event loop...")
            try:
                loop = asyncio.get_running_loop()
                print(f"[WATCHER_DEBUG] Found running loop: {loop}")
                future = asyncio.run_coroutine_threadsafe(
                    self.callback(event_type, file_path, self.project_id), 
                    loop
                )
                print(f"[WATCHER_DEBUG] Scheduled in running loop, future: {future}")
                logger.info(f"[FILE_WATCHER] ✅ Async callback scheduled in running loop")
            except RuntimeError as e:
                print(f"[WATCHER_DEBUG] No running loop available: {e}")
                logger.warning(f"[FILE_WATCHER] No event loop available for async file event: {event_type} - {file_path}")
        else:
            try:
                self.callback(event_type, file_path, self.project_id)
                logger.info(f"[FILE_WATCHER] ✅ Sync callback executed successfully")
            except Exception as e:
                logger.error(f"[FILE_WATCHER] Failed to execute sync callback: {e}")


class DockerProvider(VMProviderInterface):
    """Docker implementation of VM provider interface"""
    
    def __init__(self):
        self.docker_facade = DockerFacade()
        self.file_observers: Dict[str, Observer] = {}
        self.file_callbacks: Dict[str, Callable] = {}
        logger.info("[DOCKER_PROVIDER] Docker provider initialized")

    async def create_project_sandbox(
        self, 
        project_id: str, 
        template_id: Optional[str] = None,
        environment_type: str = "minimal"
    ) -> Dict[str, Any]:
        """Create a new Docker container for a project"""
        logger.info(f"[DOCKER_PROVIDER] Creating sandbox for project {project_id}")
        return await self.docker_facade.create_project_sandbox(
            project_id, template_id, environment_type
        )

    async def reconnect_to_sandbox(
        self, 
        project_id: str, 
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing Docker container"""
        logger.info(f"[DOCKER_PROVIDER] Reconnecting to sandbox {sandbox_id} for project {project_id}")
        return await self.docker_facade.reconnect_to_sandbox(project_id, sandbox_id)

    async def get_or_reconnect_sandbox(
        self, 
        project_id: str, 
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing container or attempt to reconnect"""
        return await self.docker_facade.get_or_reconnect_sandbox(project_id, sandbox_id)

    async def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy Docker container and clean up resources"""
        logger.info(f"[DOCKER_PROVIDER] Destroying sandbox for project {project_id}")
        return await self.docker_facade.destroy_sandbox(project_id)

    async def is_sandbox_active(self, project_id: str) -> bool:
        """Check if Docker container is active for project"""
        return await self.docker_facade.is_sandbox_active(project_id)

    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's Docker container"""
        return await self.docker_facade.get_sandbox_info(project_id)

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate Docker container"""
        return await self.docker_facade.cleanup_sandbox(project_id)

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the Docker container for a project"""
        return await self.docker_facade.destroy_project_sandbox(project_id)

    async def sync_files_to_vm(
        self, 
        project_id: str, 
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the Docker container workspace"""
        return await self.docker_facade.sync_files_to_vm(project_id, files)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from Docker container filesystem"""
        return await self.docker_facade.read_file(project_id, file_path)

    async def write_file(
        self, 
        project_id: str, 
        file_path: str, 
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in Docker container filesystem"""
        return await self.docker_facade.write_file(project_id, file_path, content, permissions)

    async def list_directory(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List directory contents in Docker container"""
        return await self.docker_facade.list_directory(project_id, path)

    async def list_files_recursive(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        return await self.docker_facade.list_files_recursive(project_id, path)
    
    async def list_directory_children(
        self, 
        project_id: str, 
        path: str = "/workspace"
    ) -> List[Dict[str, Any]]:
        """List only immediate children of a directory"""
        return await self.docker_facade.list_directory_children(project_id, path)

    async def execute_command(
        self, 
        project_id: str, 
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in Docker container"""
        return await self.docker_facade.execute_command(project_id, command, working_dir, timeout)

    async def install_package(
        self, 
        project_id: str, 
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the Docker container"""
        return await self.docker_facade.install_package(project_id, package, package_manager)

    async def start_service(
        self, 
        project_id: str, 
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the Docker container"""
        return await self.docker_facade.start_service(project_id, service_config)

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        return await self.docker_facade.stop_service(project_id, process_id)
    
    async def get_active_ports(self, project_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all active listening ports in the Docker container"""
        return await self.docker_facade.get_active_ports(project_id)

    async def setup_file_watcher(self, project_id: str, callback: Callable[[str, str, str], None]) -> None:
        """Setup file system watcher for project"""
        print(f"[DOCKER_DEBUG] setup_file_watcher called for project {project_id}")
        async with _global_watch_lock:
            print(f"[DOCKER_DEBUG] Acquired global watch lock")
            try:
                workspace_path = "/tmp/chatsparty/workspace"
                print(f"[DOCKER_DEBUG] Workspace path: {workspace_path}")
                
                import os
                if not os.path.exists(workspace_path):
                    print(f"[DOCKER_DEBUG] Directory does not exist, creating: {workspace_path}")
                    logger.warning(f"[DOCKER_PROVIDER] Workspace path {workspace_path} does not exist, creating it")
                    os.makedirs(workspace_path, exist_ok=True)
                else:
                    print(f"[DOCKER_DEBUG] Directory already exists: {workspace_path}")
                
                print(f"[DOCKER_DEBUG] Checking if path already watched: {workspace_path}")
                print(f"[DOCKER_DEBUG] _global_watched_paths keys: {list(_global_watched_paths.keys())}")
                if workspace_path in _global_watched_paths:
                    print(f"[DOCKER_DEBUG] Path already being watched globally")
                    observer = _global_watched_paths[workspace_path]
                    if observer.is_alive():
                        print(f"[DOCKER_DEBUG] Reusing existing observer")
                        logger.info(f"[DOCKER_PROVIDER] Reusing existing file watcher for project {project_id}")
                        self.file_observers[project_id] = observer
                        self.file_callbacks[project_id] = callback
                        print(f"[DOCKER_DEBUG] Stored callback for project {project_id}")
                        return
                    else:
                        print(f"[DOCKER_DEBUG] Observer is dead, cleaning up")
                        del _global_watched_paths[workspace_path]
                
                if project_id in self.file_observers:
                    await self._stop_file_watcher_unsafe(project_id)
                
                print(f"[DOCKER_DEBUG] Creating new observer")
                try:
                    current_loop = asyncio.get_running_loop()
                    print(f"[DOCKER_DEBUG] Got current event loop: {current_loop}")
                except RuntimeError:
                    current_loop = None
                    print(f"[DOCKER_DEBUG] No running event loop")
                
                print(f"[DOCKER_DEBUG] Creating DockerFileWatcher with callback: {callback}")
                event_handler = DockerFileWatcher(project_id, callback, current_loop)
                observer = Observer()
                print(f"[DOCKER_DEBUG] Scheduling observer for path: {workspace_path}")
                observer.schedule(event_handler, workspace_path, recursive=True)
                print(f"[DOCKER_DEBUG] Starting observer")
                observer.start()
                
                print(f"[DOCKER_DEBUG] Registering observer globally and locally")
                _global_watched_paths[workspace_path] = observer
                self.file_observers[project_id] = observer
                self.file_callbacks[project_id] = callback
                print(f"[DOCKER_DEBUG] Stored callback for project {project_id}")
                
                logger.info(f"[DOCKER_PROVIDER] Started new file watcher for project {project_id}")
                print(f"[DOCKER_DEBUG] File watcher setup completed successfully")
                
            except Exception as e:
                logger.error(f"[DOCKER_PROVIDER] Failed to setup file watcher for project {project_id}: {e}")

    async def stop_file_watcher(self, project_id: str) -> None:
        """Stop file system watcher for project"""
        async with _global_watch_lock:
            await self._stop_file_watcher_unsafe(project_id)
    
    async def _stop_file_watcher_unsafe(self, project_id: str) -> None:
        """Stop file watcher without acquiring lock (internal use)"""
        if project_id in self.file_observers:
            try:
                observer = self.file_observers[project_id]
                workspace_path = "/tmp/chatsparty/workspace"
                
                other_projects_using_observer = [
                    pid for pid, obs in self.file_observers.items() 
                    if obs is observer and pid != project_id
                ]
                
                if other_projects_using_observer:
                    logger.info(f"[DOCKER_PROVIDER] Keeping watcher alive for other projects: {other_projects_using_observer}")
                    del self.file_observers[project_id]
                    if project_id in self.file_callbacks:
                        del self.file_callbacks[project_id]
                else:
                    observer.stop()
                    
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, lambda: observer.join(timeout=2.0))
                    
                    if workspace_path in _global_watched_paths:
                        del _global_watched_paths[workspace_path]
                    
                    del self.file_observers[project_id]
                    
                    if project_id in self.file_callbacks:
                        del self.file_callbacks[project_id]
                    
                    logger.info(f"[DOCKER_PROVIDER] Stopped file watcher for project {project_id}")
                
            except Exception as e:
                logger.error(f"[DOCKER_PROVIDER] Error stopping file watcher for project {project_id}: {e}")
                if project_id in self.file_observers:
                    del self.file_observers[project_id]

    async def create_file(self, project_id: str, file_path: str, content: str = "") -> bool:
        """Create a new file with specified content"""
        try:
            return await self.docker_facade.write_file(project_id, file_path, content)
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] Error creating file {file_path}: {e}")
            return False

    async def create_directory(self, project_id: str, dir_path: str) -> bool:
        """Create a new directory"""
        try:
            result = await self.docker_facade.execute_command(
                project_id, 
                f"mkdir -p {dir_path}",
                working_dir="/workspace"
            )
            return result.exit_code == 0
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] Error creating directory {dir_path}: {e}")
            return False

    async def delete_file(self, project_id: str, file_path: str) -> bool:
        """Delete a file"""
        try:
            logger.info(f"[DOCKER_PROVIDER] 🗑️ Deleting file: {file_path} in project {project_id}")
            logger.info(f"[DOCKER_PROVIDER] Executing command: rm -f {file_path}")
            
            result = await self.docker_facade.execute_command(
                project_id, 
                f"rm -f {file_path}",
                working_dir="/workspace"
            )
            
            logger.info(f"[DOCKER_PROVIDER] Delete command result: exit_code={result.exit_code}")
            logger.info(f"[DOCKER_PROVIDER] Command stdout: {result.stdout}")
            logger.info(f"[DOCKER_PROVIDER] Command stderr: {result.stderr}")
            
            success = result.exit_code == 0
            logger.info(f"[DOCKER_PROVIDER] Delete file result: {success}")
            
            if success:
                await self._trigger_file_event(project_id, "deleted", file_path)
            
            return success
            
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] ❌ Error deleting file {file_path}: {e}")
            import traceback
            logger.error(f"[DOCKER_PROVIDER] Traceback: {traceback.format_exc()}")
            return False

    async def delete_directory(self, project_id: str, dir_path: str, recursive: bool = False) -> bool:
        """Delete a directory (optionally recursive)"""
        try:
            if recursive:
                command = f"rm -rf {dir_path}"
            else:
                command = f"rmdir {dir_path}"
            
            result = await self.docker_facade.execute_command(
                project_id, 
                command,
                working_dir="/workspace"
            )
            success = result.exit_code == 0
            
            if success:
                event_type = "folder_deleted" if recursive else "folder_deleted"
                await self._trigger_file_event(project_id, event_type, dir_path)
            
            return success
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] Error deleting directory {dir_path}: {e}")
            return False

    async def move_file(self, project_id: str, source_path: str, destination_path: str) -> bool:
        """Move/rename a file or directory"""
        try:
            logger.info(f"[DOCKER_PROVIDER] 📁 Moving file from {source_path} to {destination_path} in project {project_id}")
            
            # Use mv command to move/rename the file
            result = await self.docker_facade.execute_command(
                project_id, 
                f"mv '{source_path}' '{destination_path}'",
                working_dir="/workspace"
            )
            
            logger.info(f"[DOCKER_PROVIDER] Move command result: exit_code={result.exit_code}")
            logger.info(f"[DOCKER_PROVIDER] Command stdout: {result.stdout}")
            logger.info(f"[DOCKER_PROVIDER] Command stderr: {result.stderr}")
            
            success = result.exit_code == 0
            logger.info(f"[DOCKER_PROVIDER] Move file result: {success}")
            
            if success:
                # Trigger file events for the move operation
                await self._trigger_file_event(project_id, "deleted", source_path)
                await self._trigger_file_event(project_id, "created", destination_path)
            
            return success
            
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] ❌ Error moving file from {source_path} to {destination_path}: {e}")
            import traceback
            logger.error(f"[DOCKER_PROVIDER] Traceback: {traceback.format_exc()}")
            return False

    async def _trigger_file_event(self, project_id: str, event_type: str, file_path: str):
        """Manually trigger a file system event for WebSocket notifications"""
        try:
            if project_id in self.file_callbacks:
                callback = self.file_callbacks[project_id]
                
                workspace_path = "/tmp/chatsparty/workspace"
                if file_path.startswith("/workspace/"):
                    host_file_path = file_path.replace("/workspace/", f"{workspace_path}/")
                else:
                    host_file_path = f"{workspace_path}/{file_path.lstrip('/')}"
                
                logger.info(f"[DOCKER_PROVIDER] 🎯 Manually triggering file event: {event_type} - {host_file_path}")
                
                import inspect
                if inspect.iscoroutinefunction(callback):
                    await callback(event_type, host_file_path, project_id)
                else:
                    callback(event_type, host_file_path, project_id)
                
                logger.info(f"[DOCKER_PROVIDER] ✅ File event triggered successfully")
            else:
                logger.warning(f"[DOCKER_PROVIDER] No callback registered for project {project_id}")
        except Exception as e:
            logger.error(f"[DOCKER_PROVIDER] Failed to trigger file event: {e}")
            import traceback
            logger.error(f"[DOCKER_PROVIDER] Traceback: {traceback.format_exc()}")

    async def resize_terminal(self, project_id: str, exec_id: str, rows: int, cols: int) -> None:
        """Resize terminal session"""
        try:
            container_name = f"chatsparty-project-{project_id}"
            
            # Use docker client to resize
            import docker
            client = docker.from_env()
            
            # This is a limitation - docker API doesn't support resize after exec
            # For full terminal support, we might need to use docker API directly
            # or implement a different approach
            pass
        except Exception as e:
            raise Exception(f"Failed to resize terminal: {str(e)}")
            
    async def get_container_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get container information"""
        try:
            container_name = f"chatsparty-project-{project_id}"
            container = await self._get_container(container_name)
            
            if container:
                return {
                    "id": container.id,
                    "name": container.name,
                    "status": container.status,
                    "image": container.image.tags[0] if container.image.tags else "unknown"
                }
        except Exception:
            pass
        return None