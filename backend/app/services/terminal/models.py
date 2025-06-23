from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
import asyncio
import pexpect

class TerminalStatus(str, Enum):
    CREATING = "creating"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    CLOSED = "closed"

@dataclass
class TerminalSession:
    session_id: str
    project_id: str
    user_id: str
    status: TerminalStatus
    created_at: datetime
    last_activity: datetime
    container_id: Optional[str] = None
    exec_id: Optional[str] = None
    pexpect_process: Optional[pexpect.spawn] = None
    websocket_channel: Optional[str] = None
    rows: int = 24
    cols: int = 80
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "container_id": self.container_id,
            "rows": self.rows,
            "cols": self.cols
        }