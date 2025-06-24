import asyncio
import os
import subprocess
import signal
import pexpect
import threading
from typing import Dict, Optional
from datetime import datetime, timedelta
from uuid import uuid4

from .models import TerminalSession, TerminalStatus
from ..vm_factory import get_vm_service
from ..socketio.socketio_manager import socketio_manager, SocketIOMessage, MessageType

class TerminalManager:
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}
        self.session_processes: Dict[str, asyncio.Task] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the terminal manager and cleanup task"""
        self.cleanup_task = asyncio.create_task(self._cleanup_inactive_sessions())
        
    async def stop(self):
        """Stop all terminal sessions and cleanup"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            
        for session_id in list(self.sessions.keys()):
            await self.close_session(session_id)
            
    async def create_session(
        self, 
        project_id: str, 
        user_id: str
    ) -> TerminalSession:
        """Create a new terminal session"""
        session_id = f"term_{uuid4().hex[:8]}"
        websocket_channel = f"project:{project_id}:terminal:{session_id}"
        
        session = TerminalSession(
            session_id=session_id,
            project_id=project_id,
            user_id=user_id,
            status=TerminalStatus.CREATING,
            created_at=datetime.now(),
            last_activity=datetime.now(),
            websocket_channel=websocket_channel,
            rows=24,
            cols=80
        )
        
        self.sessions[session_id] = session
        
        try:
            await self._start_terminal_process(session)
            session.status = TerminalStatus.ACTIVE
            
            await self._notify_session_status(session)
            
        except Exception as e:
            session.status = TerminalStatus.ERROR
            await self._notify_session_status(session, error=str(e))
            raise
            
        return session
        
    async def close_session(self, session_id: str) -> bool:
        """Close a terminal session"""
        print(f"[TERMINAL_MANAGER] Close session called for: {session_id}")
        print(f"[TERMINAL_MANAGER] Current sessions: {list(self.sessions.keys())}")
        
        if session_id not in self.sessions:
            print(f"[TERMINAL_MANAGER] Session {session_id} not found in sessions")
            return False
            
        session = self.sessions[session_id]
        print(f"[TERMINAL_MANAGER] Found session {session_id}, status: {session.status}")
        
        if session_id in self.session_processes:
            task = self.session_processes[session_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.session_processes[session_id]
            
        if session.pexpect_process and session.pexpect_process.isalive():
            try:
                session.pexpect_process.terminate()
                session.pexpect_process.wait()
            except Exception as e:
                print(f"[TERMINAL] Error terminating pexpect process: {e}")
                try:
                    session.pexpect_process.kill(signal.SIGKILL)
                except Exception:
                    pass
                
        session.status = TerminalStatus.CLOSED
        print(f"[TERMINAL_MANAGER] Session {session_id} marked as CLOSED")
        await self._notify_session_status(session)
        
        del self.sessions[session_id]
        print(f"[TERMINAL_MANAGER] Session {session_id} deleted from sessions")
        print(f"[TERMINAL_MANAGER] Remaining sessions: {list(self.sessions.keys())}")
        return True
        
        
    async def send_input(self, session_id: str, data: str) -> bool:
        """Send input to terminal session using pexpect"""
        if session_id not in self.sessions:
            return False
            
        session = self.sessions[session_id]
        session.last_activity = datetime.now()
        
        if session.pexpect_process and session.pexpect_process.isalive():
            try:
                print(f"[TERMINAL] Sending input: {repr(data)}")
                
                await asyncio.get_event_loop().run_in_executor(
                    None, session.pexpect_process.send, data
                )
                
                return True
            except Exception as e:
                print(f"[TERMINAL] Error writing to terminal: {e}")
                return False
                
        return False
        
    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        """Get terminal session by ID"""
        return self.sessions.get(session_id)
        
    def get_user_sessions(self, user_id: str) -> list[TerminalSession]:
        """Get all sessions for a user"""
        return [s for s in self.sessions.values() if s.user_id == user_id]
        
    def get_project_sessions(self, project_id: str) -> list[TerminalSession]:
        """Get all sessions for a project"""
        return [s for s in self.sessions.values() if s.project_id == project_id]
        
    async def _start_terminal_process(self, session: TerminalSession):
        """Start the docker exec terminal process using pexpect"""
        try:
            vm_service = get_vm_service()
            
            from ..docker.implementations.container_manager import ContainerManager
            container_manager = ContainerManager()
            container = await container_manager.ensure_container_running(session.project_id)
            
            if not container:
                raise Exception(f"Failed to start container for project {session.project_id}")
            
            print(f"[TERMINAL] Container ensured running for project {session.project_id}")
            
            terminal_cmd = f"docker exec -it --env TERM=xterm-256color --env COLUMNS=80 --env LINES=24 --workdir /workspace chatsparty-project-{session.project_id} /bin/bash"
            
            print(f"[TERMINAL] Starting pexpect process: {terminal_cmd}")
            
            session.pexpect_process = await asyncio.get_event_loop().run_in_executor(
                None, pexpect.spawn, terminal_cmd
            )
            
            session.pexpect_process.setwinsize(24, 80)
            
            print(f"[TERMINAL] Pexpect process started with PID: {session.pexpect_process.pid}")
            
            await asyncio.sleep(0.5)
            
            await asyncio.get_event_loop().run_in_executor(
                None, session.pexpect_process.send, "cd /workspace && pwd && clear\n"
            )
            
            print(f"[TERMINAL] Sent initial workspace navigation command")
            
            task = asyncio.create_task(self._stream_pexpect_output(session))
            self.session_processes[session.session_id] = task
            
        except Exception as e:
            print(f"[TERMINAL] Failed to start pexpect process: {e}")
            raise
        
    async def _stream_pexpect_output(self, session: TerminalSession):
        """Stream terminal output from pexpect process via WebSocket"""
        try:
            print(f"[TERMINAL] Starting pexpect output streaming for session {session.session_id}")
            
            while session.pexpect_process and session.pexpect_process.isalive():
                try:
                    output = await asyncio.get_event_loop().run_in_executor(
                        None, self._read_pexpect_output, session.pexpect_process
                    )
                    
                    if output:
                        print(f"[TERMINAL] Sending output: {repr(output)}")
                        
                        channel = f"project:{session.project_id}:terminal:{session.session_id}"
                        print(f"[TERMINAL] Broadcasting to channel: {channel}")
                        
                        message = SocketIOMessage(
                            type=MessageType.TERMINAL_OUTPUT,
                            channel=channel,
                            data={
                                "session_id": session.session_id,
                                "output": output,
                                "type": "stdout"
                            },
                            timestamp=datetime.now()
                        )
                        
                        try:
                            print(f"[TERMINAL] Message type: {message.type}, Data: {message.data}")
                            await socketio_manager.broadcast_to_channel(channel, message)
                            print(f"[TERMINAL] Successfully broadcast message to {channel}")
                        except Exception as sio_error:
                            print(f"[TERMINAL] Error broadcasting message: {sio_error}")
                        
                    await asyncio.sleep(0.01)
                    
                except Exception as e:
                    print(f"[TERMINAL] Error reading pexpect output: {e}")
                    await asyncio.sleep(0.1)
                    
        except Exception as e:
            print(f"[TERMINAL] Error in pexpect output streaming: {e}")
        finally:
            print(f"[TERMINAL] Pexpect output streaming ended for session {session.session_id}")
    
    def _read_pexpect_output(self, process):
        """Read output from pexpect process (blocking call)"""
        try:
            data = process.read_nonblocking(size=1024, timeout=0.1)
            if data:
                if isinstance(data, bytes):
                    return data.decode('utf-8', errors='replace')
                return str(data)
            return None
        except pexpect.TIMEOUT:
            return None
        except pexpect.EOF:
            return None
        except Exception as e:
            print(f"[TERMINAL] Error reading from pexpect: {e}")
            return None

            
    async def _notify_session_status(self, session: TerminalSession, error: Optional[str] = None):
        """Notify Socket.IO clients of session status change"""
        channel = f"project:{session.project_id}:terminal:{session.session_id}"
        message = SocketIOMessage(
            type=MessageType.TERMINAL_STATUS,
            channel=channel,
            data={
                "session": session.to_dict(),
                "error": error
            },
            timestamp=datetime.now()
        )
        await socketio_manager.broadcast_to_channel(channel, message)
        
    async def _cleanup_inactive_sessions(self):
        """Cleanup inactive terminal sessions"""
        while True:
            try:
                cutoff_time = datetime.now() - timedelta(hours=2)
                inactive_sessions = [
                    session_id for session_id, session in self.sessions.items()
                    if session.last_activity < cutoff_time and session.status != TerminalStatus.ACTIVE
                ]
                
                for session_id in inactive_sessions:
                    await self.close_session(session_id)
                    
                await asyncio.sleep(300)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Terminal cleanup error: {e}")
                await asyncio.sleep(60)

terminal_manager = TerminalManager()