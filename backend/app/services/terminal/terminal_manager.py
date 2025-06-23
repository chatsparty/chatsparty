import asyncio
import os
import subprocess
import signal
from typing import Dict, Optional
from datetime import datetime, timedelta
from uuid import uuid4

from .models import TerminalSession, TerminalStatus
from ..vm_factory import get_vm_service
from ..websocket.websocket_manager import websocket_manager, WebSocketMessage, MessageType

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
        user_id: str, 
        rows: int = 24, 
        cols: int = 80
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
            rows=rows,
            cols=cols
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
        if session_id not in self.sessions:
            return False
            
        session = self.sessions[session_id]
        
        if session_id in self.session_processes:
            task = self.session_processes[session_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.session_processes[session_id]
            
        if session.process and session.process.returncode is None:
            try:
                session.process.terminate()
                await asyncio.wait_for(session.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                session.process.kill()
                await session.process.wait()
                
        session.status = TerminalStatus.CLOSED
        await self._notify_session_status(session)
        
        del self.sessions[session_id]
        return True
        
    async def resize_session(self, session_id: str, rows: int, cols: int) -> bool:
        """Resize terminal session"""
        if session_id not in self.sessions:
            return False
            
        session = self.sessions[session_id]
        session.rows = rows
        session.cols = cols
        session.last_activity = datetime.now()
        
        try:
            print(f"[TERMINAL] Resizing terminal to {cols}x{rows}")
            return True
        except Exception as e:
            print(f"[TERMINAL] Error resizing terminal: {e}")
            return False
        
    async def send_input(self, session_id: str, data: str) -> bool:
        """Send input to terminal session"""
        if session_id not in self.sessions:
            return False
            
        session = self.sessions[session_id]
        session.last_activity = datetime.now()
        
        if session.process and session.process.stdin:
            try:
                print(f"[TERMINAL] Sending input: {repr(data)}")
                session.process.stdin.write(data.encode('utf-8'))
                await session.process.stdin.drain()
                
                if data == '\r':
                    asyncio.create_task(self._add_prompt_after_command(session))
                
                return True
            except Exception as e:
                print(f"[TERMINAL] Error writing to terminal: {e}")
                return False
                
        return False
        
    async def _add_prompt_after_command(self, session: TerminalSession):
        """Add a prompt after command execution"""
        try:
            await asyncio.sleep(0.2)
            
            if session.process and session.process.stdin:
                prompt_cmd = "echo -n 'root@container:'$(pwd)'$ '\n"
                session.process.stdin.write(prompt_cmd.encode('utf-8'))
                await session.process.stdin.drain()
                print(f"[TERMINAL] Added prompt after command")
        except Exception as e:
            print(f"[TERMINAL] Error adding prompt: {e}")
        
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
        """Start the docker exec terminal process"""
        try:
            terminal_cmd = [
                "docker", "exec", "-i",
                f"--env", f"TERM=xterm-256color",
                f"--env", f"COLUMNS={session.cols}",
                f"--env", f"LINES={session.rows}", 
                f"--workdir", "/workspace",
                f"chatsparty-project-{session.project_id}",
                "/bin/bash", "-c", """
                    export PS1='root@container:\\w\\$ '
                    exec /bin/bash --login -i 2>/dev/null
                """
            ]
            
            print(f"[TERMINAL] Starting process: {' '.join(terminal_cmd)}")
            
            session.process = await asyncio.create_subprocess_exec(
                *terminal_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                preexec_fn=os.setsid
            )
            
            print(f"[TERMINAL] Process started with PID: {session.process.pid}")
            
            if session.process.stdin:
                init_commands = """clear
echo -n 'root@container:/workspace$ '
"""
                session.process.stdin.write(init_commands.encode('utf-8'))
                await session.process.stdin.drain()
                print(f"[TERMINAL] Sent initial commands")
            
            task = asyncio.create_task(self._stream_output(session))
            self.session_processes[session.session_id] = task
            
        except Exception as e:
            print(f"[TERMINAL] Failed to start process: {e}")
            raise
        
    async def _stream_output(self, session: TerminalSession):
        """Stream terminal output via WebSocket"""
        try:
            print(f"[TERMINAL] Starting output streaming for session {session.session_id}")
            
            buffer = b""
            
            while session.process and session.process.returncode is None:
                try:
                    data = await asyncio.wait_for(
                        session.process.stdout.read(256), 
                        timeout=0.1
                    )
                    
                    if data:
                        buffer += data
                        
                        text = buffer.decode('utf-8', errors='ignore')
                        
                        if text:
                            print(f"[TERMINAL] Sending output: {repr(text)}")
                            
                            message = WebSocketMessage(
                                type=MessageType.TERMINAL_OUTPUT,
                                channel=session.websocket_channel,
                                data={
                                    "session_id": session.session_id,
                                    "output": text,
                                    "type": "stdout"
                                },
                                timestamp=datetime.now()
                            )
                            await websocket_manager.broadcast_to_channel(
                                session.websocket_channel, 
                                message
                            )
                            
                            session.last_activity = datetime.now()
                            buffer = b""
                        
                except asyncio.TimeoutError:
                    if buffer:
                        text = buffer.decode('utf-8', errors='ignore')
                        if text.strip():
                            print(f"[TERMINAL] Flushing buffer: {repr(text)}")
                            
                            message = WebSocketMessage(
                                type=MessageType.TERMINAL_OUTPUT,
                                channel=session.websocket_channel,
                                data={
                                    "session_id": session.session_id,
                                    "output": text,
                                    "type": "stdout"
                                },
                                timestamp=datetime.now()
                            )
                            await websocket_manager.broadcast_to_channel(
                                session.websocket_channel, 
                                message
                            )
                        buffer = b""
                    
                    if session.process.returncode is not None:
                        print(f"[TERMINAL] Process ended with return code: {session.process.returncode}")
                        break
                except Exception as e:
                    print(f"[TERMINAL] Error reading output: {e}")
                    break
                    
        except Exception as e:
            print(f"[TERMINAL] Terminal streaming error: {e}")
        finally:
            print(f"[TERMINAL] Output streaming ended for session {session.session_id}")
            session.status = TerminalStatus.INACTIVE
            await self._notify_session_status(session)
            
    async def _notify_session_status(self, session: TerminalSession, error: Optional[str] = None):
        """Notify WebSocket clients of session status change"""
        message = WebSocketMessage(
            type=MessageType.TERMINAL_STATUS,
            channel=session.websocket_channel,
            data={
                "session": session.to_dict(),
                "error": error
            },
            timestamp=datetime.now()
        )
        await websocket_manager.broadcast_to_channel(
            session.websocket_channel,
            message
        )
        
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